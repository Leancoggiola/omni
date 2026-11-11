// tamagui-ignore
import { formatPantryQuantity, hasValidCheckDigit, isInternalBarcode, normalizeBarcode } from '@omni/shared/pantry';
import { FONT_SIZE, RADIUS, SPACING } from '@omni/shared/theme';
import { CameraView, useCameraPermissions, type BarcodeScanningResult, type BarcodeType } from 'expo-camera';
import { CameraIcon, CameraSlashIcon, FlashlightIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { Paragraph, XStack, YStack } from 'tamagui';

import { ApiError } from '@/shared/api';
import {
  Banner,
  Button,
  EmptyState,
  ErrorState,
  FormSheet,
  getErrorMessage,
  IconButton,
  LoadingState,
  notifySuccess,
  notifyWarning,
  Spinner,
  type BannerColor,
} from '@/shared/ui';

import { usePantryBarcode } from '../hooks/usePantryBarcode';
import { usePantryMutations } from '../hooks/usePantryMutations';
import { useSheetNotice } from '../hooks/useSheetNotice';
import { createScanGate } from '../utils/scanGate';
import { ProductForm } from './ProductForm';

import type {
  CreatePantryProductPayload,
  PantryBarcodeSuggestion,
  PantryScanResult,
  ProductFormValues,
} from '@omni/shared/pantry';

const BARCODE_TYPES: BarcodeType[] = ['ean13', 'ean8', 'upc_a'];
const CAMERA_HEIGHT = 280;
const FRAME_INSET = SPACING.xl;
const INTERNAL_CODE_HINT =
  'Es un código interno del comercio (balanza, fiambrería): no identifica al producto. Cargalo a mano.';
const UNKNOWN_RESULT_MESSAGE = 'No sabemos si se sumó. Revisá el inventario antes de volver a escanearlo.';

type FormSource = 'FOUND' | 'NOT_FOUND' | 'UNAVAILABLE' | 'MANUAL';

type FormPhase = { kind: 'form'; barcode: string | null; source: FormSource; suggestion?: PantryBarcodeSuggestion };

type Phase =
  | { kind: 'camera' }
  | { kind: 'processing'; barcode: string }
  | { kind: 'error'; barcode: string; message: string; retryable: boolean }
  | FormPhase;

type Notice = {
  color: BannerColor;
  message: string;
  undo?: { result: PantryScanResult; quantity: number };
};

type ScanSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed?: () => void;
};

/**
 * Indica si una falla del escaneo deja sin saber si la API lo registró: un error de red, un timeout (status 0) o un
 * 504 en un POST pueden llegar después de que la API sumó. Ahí no se ofrece reintentar ni cargar a mano, porque
 * sumarían otra vez.
 */
function isUnknownResult(err: unknown): boolean {
  return !(err instanceof ApiError) || err.status === 0 || err.status === 504;
}

/**
 * Aviso de un escaneo registrado según su `outcome`. Un `INCREMENTED` que viene del formulario con un producto que ya
 * tenía otro código avisa que este no quedó guardado (la API solo suma).
 */
function scanNotice(result: PantryScanResult, quantity: number, barcode: string): Notice {
  const { outcome, product } = result;
  const amount = formatPantryQuantity(quantity, product.unit);
  const undo = { result, quantity };
  if (outcome === 'CREATED') return { color: 'success', message: `Agregamos ${product.name}`, undo };
  if (outcome === 'LINKED') {
    return { color: 'success', message: `Sumamos ${amount} a ${product.name} y guardamos el código`, undo };
  }
  if (product.barcode !== barcode) {
    return {
      color: 'warning',
      message: `Sumamos ${amount} a ${product.name}. Ya tenía otro código, así que este no quedó guardado`,
      undo,
    };
  }
  return { color: 'success', message: `Sumamos ${amount} a ${product.name}`, undo };
}

/** Valores precargados del alta según de dónde viene: la sugerencia de Open Food Facts o solo la cantidad. */
function prefillFor(phase: FormPhase): Partial<ProductFormValues> | undefined {
  if (phase.source === 'MANUAL') return undefined;
  if (!phase.suggestion) return { quantity: 1 };
  const { name, category, unit } = phase.suggestion;
  return { name, category, unit, quantity: 1 };
}

/** Aviso de arriba del alta: qué se sabe del código y qué falta completar. */
function formBanner(phase: FormPhase): { color: BannerColor; message: string } | null {
  if (phase.source === 'FOUND') {
    return {
      color: 'info',
      message: phase.suggestion?.category
        ? 'Encontramos el producto en Open Food Facts. Revisá los datos antes de guardar.'
        : 'Encontramos el producto en Open Food Facts. Elegí la categoría y revisá los datos.',
    };
  }
  if (phase.source === 'NOT_FOUND') {
    return {
      color: 'info',
      message: `No encontramos el código ${phase.barcode}. Cargalo y la próxima vez lo reconocemos.`,
    };
  }
  if (phase.source === 'UNAVAILABLE') {
    return {
      color: 'warning',
      message: 'No pudimos consultar el catálogo. Cargalo a mano y el código queda guardado.',
    };
  }
  return null;
}

type CameraPanelProps = {
  scanning: boolean;
  torch: boolean;
  onTorchChange: (torch: boolean) => void;
  onScanned: (result: BarcodeScanningResult) => void;
  onReady: () => void;
};

/**
 * Cámara con el marco y la linterna, o el estado del permiso: mientras se resuelve, un spinner; sin pedir todavía,
 * la explicación y "Permitir cámara"; denegado sin poder volver a preguntar, "Abrir Ajustes" ("Cargar a mano" queda
 * debajo, en la hoja). El permiso se vuelve a leer al volver a la app, para tomar el cambio hecho en Ajustes.
 * `scanning` apaga la lectura sin desmontar la cámara; `onReady` avisa cada vez que la cámara queda lista.
 */
function CameraPanel({ scanning, torch, onTorchChange, onScanned, onReady }: CameraPanelProps) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [mountError, setMountError] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void getPermission().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [getPermission]);

  if (!permission) return <LoadingState />;

  if (!permission.granted) {
    const blocked = !permission.canAskAgain;
    return (
      <EmptyState
        icon={blocked ? CameraSlashIcon : CameraIcon}
        title={blocked ? 'La cámara está bloqueada para Omni' : 'Usá la cámara para escanear'}
        action={
          <YStack gap={SPACING.sm} alignSelf="stretch">
            <Paragraph color="$dimmed" fontSize={FONT_SIZE.md} textAlign="center">
              {blocked
                ? 'Habilitala en Ajustes para escanear códigos, o cargá el producto a mano.'
                : 'La usamos solo para leer el código de barras de tus productos.'}
            </Paragraph>
            <Button
              fullWidth
              onPress={() => (blocked ? void Linking.openSettings() : void requestPermission().catch(() => undefined))}
            >
              {blocked ? 'Abrir Ajustes' : 'Permitir cámara'}
            </Button>
          </YStack>
        }
      />
    );
  }

  if (mountError) {
    return <ErrorState message="No se pudo abrir la cámara" onRetry={() => setMountError(false)} />;
  }

  return (
    <YStack gap={SPACING.sm}>
      <YStack
        height={CAMERA_HEIGHT}
        borderRadius={RADIUS.lg}
        overflow="hidden"
        backgroundColor="$track"
        accessible
        accessibilityLabel="Vista de la cámara para escanear el código"
      >
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
          onBarcodeScanned={scanning ? onScanned : undefined}
          onCameraReady={onReady}
          onMountError={() => setMountError(true)}
        />
        <YStack
          position="absolute"
          top={FRAME_INSET}
          bottom={FRAME_INSET}
          left={FRAME_INSET}
          right={FRAME_INSET}
          borderWidth={2}
          borderColor="$primary"
          borderRadius={RADIUS.md}
          pointerEvents="none"
        />
      </YStack>
      <XStack alignItems="center" gap={SPACING.sm}>
        <Paragraph flex={1} color="$dimmed" fontSize={FONT_SIZE.md}>
          Apuntá al código de barras del envase.
        </Paragraph>
        <IconButton
          icon={FlashlightIcon}
          variant={torch ? 'filled' : 'light'}
          accessibilityLabel={torch ? 'Apagar linterna' : 'Encender linterna'}
          selected={torch}
          onPress={() => onTorchChange(!torch)}
        />
      </XStack>
    </YStack>
  );
}

type ScanFlowProps = {
  open: boolean;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onClosingNotice: (message: string) => void;
};

/**
 * Contenido de la hoja de escaneo. Un código ya vinculado suma 1 al instante y la cámara sigue abierta (no se desmonta
 * mientras se resuelve un código) con el aviso y "Deshacer". Uno nuevo pasa por la consulta: si Open Food Facts lo
 * conoce, el alta llega precargada (con el link a la ficha, que pide la licencia); si no, con el código guardado para
 * la próxima. Los códigos internos de un comercio se avisan sin salir a la red ni perder el "Deshacer" pendiente, las
 * lecturas con dígito verificador inválido se ignoran y un error de la consulta ofrece reintentar o cargar a mano,
 * nunca se muestra como "no encontrado". Si el escaneo falla sin saber si la API lo registró, solo se ofrece volver a
 * la cámara. Con la hoja cerrándose la cámara deja de leer, y un resultado que llega tarde se avisa con un toast.
 */
function ScanFlow({ open, busy, onBusyChange, onClosingNotice }: ScanFlowProps) {
  const { lookup, scan, undoScan } = usePantryBarcode();
  const { createProduct } = usePantryMutations();
  const [gate] = useState(createScanGate);
  const [phase, setPhase] = useState<Phase>({ kind: 'camera' });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [torch, setTorch] = useState(false);
  const mounted = useRef(true);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const backToCamera = () => {
    setPhase({ kind: 'camera' });
    gate.release(Date.now());
  };

  const report = (next: Notice) => {
    if (!mounted.current) {
      if (next.color === 'warning') notifyWarning(next.message);
      else notifySuccess(next.message);
      return;
    }
    if (!openRef.current) onClosingNotice(next.message);
    setNotice(next);
  };

  const scanIfLinked = async (barcode: string) => {
    try {
      return await scan({ barcode });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  };

  const resolve = async (barcode: string) => {
    setNotice(null);
    setHint(null);
    setPhase({ kind: 'processing', barcode });
    let stage: 'scan' | 'lookup' = 'scan';
    try {
      const linked = await scanIfLinked(barcode);
      if (linked) {
        report(scanNotice(linked, 1, barcode));
        backToCamera();
        return;
      }
      stage = 'lookup';
      const found = await lookup(barcode);
      if (found.status === 'IN_PANTRY') {
        stage = 'scan';
        const rescanned = await scanIfLinked(barcode);
        if (rescanned) {
          report(scanNotice(rescanned, 1, barcode));
          backToCamera();
          return;
        }
        setPhase({ kind: 'form', barcode, source: 'NOT_FOUND' });
        return;
      }
      setPhase({
        kind: 'form',
        barcode,
        source: found.status,
        suggestion: found.status === 'FOUND' ? found.suggestion : undefined,
      });
    } catch (err) {
      if (stage === 'scan' && isUnknownResult(err)) {
        setPhase({ kind: 'error', barcode, message: UNKNOWN_RESULT_MESSAGE, retryable: false });
        return;
      }
      setPhase({
        kind: 'error',
        barcode,
        message: getErrorMessage(err, 'No se pudo buscar el código'),
        retryable: true,
      });
    }
  };

  const handleScanned = ({ data }: BarcodeScanningResult) => {
    const barcode = normalizeBarcode(data);
    if (!hasValidCheckDigit(barcode)) return;
    const now = Date.now();
    if (!gate.accept(barcode, now)) return;
    if (isInternalBarcode(barcode)) {
      setHint(INTERNAL_CODE_HINT);
      gate.release(now);
      return;
    }
    void resolve(barcode);
  };

  const handleUndo = async () => {
    if (!notice?.undo || undoing) return;
    const { result, quantity } = notice.undo;
    const { name, unit } = result.product;
    setUndoing(true);
    onBusyChange(true);
    try {
      const { codeKept } = await undoScan(result, quantity);
      setNotice(
        codeKept
          ? {
              color: 'warning',
              message: `Restamos ${formatPantryQuantity(quantity, unit)} a ${name}, pero el código sigue vinculado. Quitalo desde el detalle.`,
            }
          : { color: 'info', message: 'Deshicimos el último escaneo' }
      );
    } catch {
      setNotice({ color: 'destructive', message: `No se pudo deshacer. Revisá ${name} en el inventario.` });
    } finally {
      setUndoing(false);
      onBusyChange(false);
    }
  };

  const handleSubmit = async (payload: CreatePantryProductPayload) => {
    if (phase.kind !== 'form') return;
    if (phase.barcode === null) {
      const created = await createProduct(payload);
      report({ color: 'success', message: `Agregamos ${created.name}` });
      return;
    }
    const { quantity, ...product } = payload;
    const result = await scan({ barcode: phase.barcode, quantity, product });
    report(scanNotice(result, quantity, phase.barcode));
  };

  const manual = (barcode: string | null, source: FormSource) => {
    setNotice(null);
    setHint(null);
    setPhase({ kind: 'form', barcode, source });
  };

  if (phase.kind === 'error') {
    return (
      <YStack gap={SPACING.sm}>
        <ErrorState message={phase.message} onRetry={phase.retryable ? () => void resolve(phase.barcode) : undefined} />
        {phase.retryable ? (
          <Button fullWidth variant="light" onPress={() => manual(phase.barcode, 'UNAVAILABLE')}>
            Cargar a mano
          </Button>
        ) : null}
        <Button fullWidth variant="outline" onPress={backToCamera}>
          Volver a escanear
        </Button>
      </YStack>
    );
  }

  if (phase.kind === 'form') {
    const banner = formBanner(phase);
    const sourceUrl = phase.suggestion?.sourceUrl;
    return (
      <YStack gap={SPACING.md}>
        {banner ? <Banner color={banner.color}>{banner.message}</Banner> : null}
        {phase.barcode ? (
          <Paragraph color="$dimmed" fontSize={FONT_SIZE.md}>
            {`Código ${phase.barcode}`}
          </Paragraph>
        ) : null}
        <ProductForm
          prefill={prefillFor(phase)}
          requirePositiveQuantity={phase.barcode !== null}
          onSubmit={handleSubmit}
          submitting={busy}
          onSubmittingChange={onBusyChange}
          onDone={() => {
            onBusyChange(false);
            backToCamera();
          }}
        />
        {sourceUrl ? (
          <YStack gap={SPACING.xs}>
            <Paragraph color="$dimmed" fontSize={FONT_SIZE.sm} textAlign="center">
              Datos de Open Food Facts, con licencia ODbL.
            </Paragraph>
            <Button
              fullWidth
              variant="subtle"
              disabled={busy}
              onPress={() => void Linking.openURL(sourceUrl).catch(() => undefined)}
            >
              Ver en Open Food Facts
            </Button>
          </YStack>
        ) : null}
        <Button fullWidth variant="outline" disabled={busy} onPress={backToCamera}>
          Volver a escanear
        </Button>
      </YStack>
    );
  }

  const processing = phase.kind === 'processing' ? phase.barcode : null;

  return (
    <YStack gap={SPACING.md}>
      {processing ? (
        <XStack
          alignItems="center"
          justifyContent="center"
          gap={SPACING.sm}
          accessible
          accessibilityLabel={`Buscando el código ${processing}`}
          accessibilityLiveRegion="polite"
        >
          <Spinner size="small" />
          <Paragraph color="$dimmed" fontSize={FONT_SIZE.md}>
            {`Buscando ${processing}…`}
          </Paragraph>
        </XStack>
      ) : null}
      {hint ? <Banner color="warning">{hint}</Banner> : null}
      {notice ? <Banner color={notice.color}>{notice.message}</Banner> : null}
      {notice?.undo ? (
        <Button fullWidth variant="outline" loading={undoing} onPress={() => void handleUndo()}>
          Deshacer
        </Button>
      ) : null}
      <CameraPanel
        scanning={open && !processing && !undoing}
        torch={torch}
        onTorchChange={setTorch}
        onScanned={handleScanned}
        onReady={() => gate.touch(Date.now())}
      />
      <Button
        fullWidth
        variant="light"
        disabled={undoing || Boolean(processing)}
        onPress={() => manual(null, 'MANUAL')}
      >
        Cargar a mano
      </Button>
    </YStack>
  );
}

/**
 * Hoja de escaneo de códigos de barras de la alacena (#260). El contenido se desmonta al cerrarla, así que la cámara
 * se apaga y la próxima vez arranca de cero. Mientras se guarda un alta o se deshace un escaneo no se puede cerrar; la
 * consulta de un código sí, y lo que la API registre después se avisa al terminar de cerrarse.
 */
export function ScanSheet({ open, onOpenChange, onClosed }: ScanSheetProps) {
  const [busy, setBusy] = useState(false);
  const closingNotice = useSheetNotice();

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Escanear código"
      busy={busy}
      onClosed={() => {
        closingNotice.flush();
        onClosed?.();
      }}
    >
      <ScanFlow open={open} busy={busy} onBusyChange={setBusy} onClosingNotice={closingNotice.queue} />
    </FormSheet>
  );
}
