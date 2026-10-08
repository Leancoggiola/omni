import { ActionIcon, Alert, AppShell, Card, Combobox, Input, Modal, NavLink, Paper, Select, Tabs } from '@mantine/core';

import { componentOverrides } from './components.overrides';

import { CaretRightIcon } from '@phosphor-icons/react';

const surfaceBg = 'var(--mantine-color-default)';

export const ComponentsOverride = {
  ActionIcon: ActionIcon.extend({
    classNames: componentOverrides.actionIcon,
  }),
  Alert: Alert.extend({
    classNames: componentOverrides.alert,
    defaultProps: { variant: 'light-custom' },
  }),
  AppShell: AppShell.extend({
    classNames: componentOverrides.appShell,
    styles: {
      header: { backgroundColor: surfaceBg },
    },
  }),

  Card: Card.extend({
    defaultProps: { shadow: 'sm', withBorder: false, radius: 'md' },
    styles: {
      root: { backgroundColor: surfaceBg },
    },
  }),

  Combobox: Combobox.extend({
    classNames: componentOverrides.combobox,
  }),

  Input: Input.extend({
    defaultProps: { size: 'md' },
  }),

  Modal: Modal.extend({
    classNames: componentOverrides.modal,
  }),

  NavLink: NavLink.extend({
    defaultProps: {
      noWrap: true,
      keepMounted: false,
      rightSection: <CaretRightIcon size="1rem" />,
    },
    classNames: componentOverrides.navlink,
  }),

  Paper: Paper.extend({
    defaultProps: { p: 'lg', shadow: 'sm', withBorder: false },
    styles: {
      root: { backgroundColor: surfaceBg },
    },
  }),

  Select: Select.extend({
    classNames: componentOverrides.combobox,
  }),

  Tabs: Tabs.extend({
    classNames: componentOverrides.tabs,
  }),
};
