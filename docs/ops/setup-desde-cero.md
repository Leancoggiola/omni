# Setup desde cero (cambio de PC o reconstrucción)

Guía para volver a montar las credenciales y la infraestructura del release y de los backups. No contiene valores secretos: solo qué crear, dónde y con qué nombre. Los valores van al gestor de contraseñas y a GitHub.

Ver también [deployment.md](./deployment.md) (arquitectura, pipeline y runbooks).

---

## 0. Qué se guarda fuera de GitHub

Carpeta local de secretos (fuera del repo): `D:\Proyectos\Secrets\omni`.

| Archivo                | Qué es                                     | Copia de respaldo                          |
| ---------------------- | ------------------------------------------ | ------------------------------------------ |
| `omni-release.jks`     | Keystore de firma del APK                  | Gestor de contraseñas o disco aparte       |
| `age-key-recovery.txt` | Clave privada `age` B (recuperación)       | Gestor de contraseñas o disco aparte       |
| `age-key-ci.txt`       | Clave privada `age` A (la misma que en CI) | Opcional: ya vive en `BACKUP_AGE_IDENTITY` |

Sin `omni-release.jks` no se pueden publicar actualizaciones del APK instalado (habría que desinstalar y reinstalar). Sin `age-key-recovery.txt` y sin la clave A no se pueden abrir los backups. Ninguno de estos archivos se sube al repo (`*.jks`, `*.keystore`, `age-key*`, `*.age` y `*.dump` están en `.gitignore`).

En una PC nueva: instalar `gh` (y `gh auth login`), `age` (`winget install FiloSottile.age`), Java 17 (`keytool`) y Node 22 con pnpm.

---

## 1. GitHub: environment `Production`

Settings → Environments → `Production`:

- **Deployment branches and tags:** solo `main` y `develop`.
- Secrets y variables del release y de los backups viven acá, no a nivel de repo. El único secret de repo es `CLAUDE_CODE_OAUTH_TOKEN`.
- Settings → Code security: activar **Secret scanning** y **Push protection**.

Lista completa en [deployment.md](./deployment.md#secrets-y-variables).

---

## 2. Tokens de GitHub y Vercel (vencen)

| Secret           | Cómo crearlo                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `RELEASE_TOKEN`  | github.com/settings/tokens → PAT con scope `repo`, vencimiento de 90 días.                                     |
| `APK_REPO_TOKEN` | github.com/settings/personal-access-tokens → fine-grained, solo `omni-apk`, Contents: Read and write, 90 días. |
| `VERCEL_TOKEN`   | vercel.com/account/tokens, con vencimiento.                                                                    |

```powershell
gh secret set RELEASE_TOKEN --env Production --repo Leancoggiola/omni
gh secret set APK_REPO_TOKEN --env Production --repo Leancoggiola/omni
gh secret set VERCEL_TOKEN --env Production --repo Leancoggiola/omni
```

Después de renovar, correr un workflow y recién ahí revocar el token anterior. Hay un recordatorio programado una semana antes del vencimiento.

`VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` no son secretos reales: salen de `.vercel/project.json` después de `vercel link` (hacerlo en una carpeta temporal).

---

## 3. Render, Supabase y variables

- `RENDER_DEPLOY_HOOK_PROD`: Render → servicio → Settings → Deploy Hook (Regenerate si se filtra).
- `PROD_DIRECT_URL`: Supabase `omni-prod` → Connect → **Session pooler** (5432), con el password real. Si se resetea el password de la base, actualizar también las variables `DATABASE_URL` y `DIRECT_URL` en Render.
- Variable `PROD_WEB_URL`: `https://omni-nest.vercel.app`.
- Al crear proyectos en Supabase: sin integración de GitHub, sin Branching, Data API desactivada, región us-east-1 para prod.

```powershell
gh secret set PROD_DIRECT_URL --env Production --repo Leancoggiola/omni
gh secret set RENDER_DEPLOY_HOOK_PROD --env Production --repo Leancoggiola/omni
gh variable set PROD_WEB_URL --env Production --repo Leancoggiola/omni --body "https://omni-nest.vercel.app"
```

---

## 4. Keystore de Android

```powershell
New-Item -ItemType Directory -Force D:\Proyectos\Secrets\omni | Out-Null
Set-Location D:\Proyectos\Secrets\omni
keytool -genkeypair -v -keystore omni-release.jks -alias omni -keyalg RSA -keysize 2048 -validity 10000
```

Usar el mismo password para el store y para la key, y guardarlo en el gestor de contraseñas. Después:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\Proyectos\Secrets\omni\omni-release.jks")) | gh secret set ANDROID_KEYSTORE_BASE64 --env Production --repo Leancoggiola/omni
gh secret set ANDROID_KEYSTORE_PASSWORD --env Production --repo Leancoggiola/omni
gh secret set ANDROID_KEY_ALIAS --env Production --repo Leancoggiola/omni
gh secret set ANDROID_KEY_PASSWORD --env Production --repo Leancoggiola/omni
```

`ANDROID_KEY_ALIAS` es `omni`. Si se reemplaza la keystore, los APK ya instalados hay que desinstalarlos.

---

## 5. Claves `age` (cifrado de backups)

```powershell
winget install FiloSottile.age
New-Item -ItemType Directory -Force D:\Proyectos\Secrets\omni | Out-Null
age-keygen -o D:\Proyectos\Secrets\omni\age-key-ci.txt
age-keygen -o D:\Proyectos\Secrets\omni\age-key-recovery.txt
```

Cada comando imprime `Public key: age1...`. Cargar:

```powershell
(Select-String -Path D:\Proyectos\Secrets\omni\age-key-ci.txt -Pattern 'AGE-SECRET-KEY').Line | gh secret set BACKUP_AGE_IDENTITY --env Production --repo Leancoggiola/omni
gh variable set BACKUP_AGE_RECIPIENT --env Production --repo Leancoggiola/omni --body "age1...clave-A..."
gh variable set BACKUP_AGE_RECIPIENT_RECOVERY --env Production --repo Leancoggiola/omni --body "age1...clave-B..."
```

Guardar `age-key-recovery.txt` en el gestor de contraseñas. Los backups viejos solo se abren con la clave con la que se cifraron.

---

## 6. AWS S3 para backups

Cuenta de AWS con MFA en el usuario raíz y un presupuesto de aviso (Billing → Budgets → _Zero spend budget_). Región `us-east-1`. El usuario raíz solo se usa para crear estas cosas; nunca se le crean access keys.

### 6.1 Bucket

S3 → Create bucket:

| Campo               | Valor                                                                          |
| ------------------- | ------------------------------------------------------------------------------ |
| Bucket type         | General purpose                                                                |
| Bucket name         | `omni-backups-<algo-único>` (el actual está en la variable `BACKUP_S3_BUCKET`) |
| Object Ownership    | **ACLs disabled** (Bucket owner enforced)                                      |
| Block Public Access | **Block all public access** (los 4 marcados)                                   |
| Bucket Versioning   | **Enable**                                                                     |
| Default encryption  | SSE-S3, Bucket Key habilitada                                                  |
| Object Lock         | Disable                                                                        |

### 6.2 Regla de ciclo de vida

Bucket → Management → Create lifecycle rule:

- Nombre `expirar-90-dias`, alcance con filtro, prefijo `omni/`.
- Acciones tildadas: hacer que venzan las versiones actuales (**90** días), eliminar permanentemente las versiones no actuales (**30** días) y eliminar marcadores de eliminación vencidos y cargas multiparte incompletas (**7** días).
- No tildar las dos de transición entre clases de almacenamiento.

Es una regla del bucket: no se repite ni se renueva.

### 6.3 Política del bucket (solo HTTPS)

Bucket → Permissions → Bucket policy (reemplazar `BUCKET`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::BUCKET", "arn:aws:s3:::BUCKET/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }
  ]
}
```

### 6.4 Usuarios IAM

IAM → Users → Create user, sin acceso a la consola y sin políticas adjuntas. En cada uno: Add permissions → Create inline policy → JSON.

**`omni-backup-writer`** (política `escritura-backups`), solo sube:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:AbortMultipartUpload"],
      "Resource": "arn:aws:s3:::BUCKET/omni/*"
    }
  ]
}
```

**`omni-backup-reader`** (política `lectura-backups`), solo lee:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::BUCKET",
      "Condition": { "StringLike": { "s3:prefix": "omni/*" } }
    },
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::BUCKET/omni/*"
    }
  ]
}
```

En cada usuario: Security credentials → Create access key → _Application running outside AWS_. Copiar el Access key ID y el Secret (se ve una sola vez). No tienen vencimiento; se rotan cada 12 meses (ver el calendario de [deployment.md](./deployment.md#calendario-de-credenciales)).

### 6.5 Cargar en GitHub

```powershell
gh secret set BACKUP_S3_ACCESS_KEY_ID --env Production --repo Leancoggiola/omni
gh secret set BACKUP_S3_SECRET_ACCESS_KEY --env Production --repo Leancoggiola/omni
gh secret set BACKUP_S3_READ_ACCESS_KEY_ID --env Production --repo Leancoggiola/omni
gh secret set BACKUP_S3_READ_SECRET_ACCESS_KEY --env Production --repo Leancoggiola/omni
gh variable set BACKUP_S3_REGION --env Production --repo Leancoggiola/omni --body "us-east-1"
gh variable set BACKUP_S3_BUCKET --env Production --repo Leancoggiola/omni --body "NOMBRE-DEL-BUCKET"
```

Las dos primeras son las claves de `omni-backup-writer` y las otras dos las de `omni-backup-reader`. No definir `BACKUP_S3_ENDPOINT` (solo se usa con S3-compatibles que no son AWS).

---

## 7. Verificación

1. `gh secret list --env Production --repo Leancoggiola/omni` y `gh variable list --env Production --repo Leancoggiola/omni`: deben estar todos los nombres de [deployment.md](./deployment.md#secrets-y-variables).
2. Actions → **Backup** → Run workflow: debe terminar en verde y dejar un `.dump.age` bajo `omni/` en el bucket.
3. Actions → **Backup** → Run workflow con `restore_test` activado: restaura el último backup en un Postgres efímero y verifica schema, migraciones y usuarios.
4. Una vez que un release pase con un token nuevo, revocar el anterior.

---

## 8. Recordatorios

| Qué                                                       | Cuándo                                                                                              |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Renovar `RELEASE_TOKEN`, `APK_REPO_TOKEN`, `VERCEL_TOKEN` | Una semana antes de su vencimiento (creados el 14/10/2026 por 90 días: vencen cerca del 12/01/2027) |
| Rotar las claves IAM de AWS                               | Cada 12 meses                                                                                       |
| Probar el restore                                         | Mensual, lo hace `backup.yml` solo                                                                  |

Los recordatorios son tareas programadas de la app de Claude en la PC del dueño; si se cambia de PC hay que volver a crearlos a partir de esta tabla.
