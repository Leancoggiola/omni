import {
  ActionIcon,
  Alert,
  AppShell,
  Card,
  Combobox,
  Input,
  Menu,
  Modal,
  NavLink,
  Paper,
  Popover,
  SegmentedControl,
  Select,
  Tabs,
} from '@mantine/core';

import { componentOverrides } from './components.overrides';

import { CaretRightIcon } from '@phosphor-icons/react';

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
      header: { backgroundColor: 'var(--mantine-color-surfaces-glass)' },
    },
  }),

  Card: Card.extend({
    classNames: componentOverrides.glass,
    defaultProps: { shadow: 'card', withBorder: false, radius: 'xl' },
  }),

  Combobox: Combobox.extend({
    classNames: componentOverrides.combobox,
  }),

  Input: Input.extend({
    defaultProps: { size: 'md' },
  }),

  Menu: Menu.extend({
    classNames: componentOverrides.dropdown,
  }),

  Modal: Modal.extend({
    classNames: componentOverrides.modal,
    defaultProps: { radius: 'xl', shadow: 'sheet' },
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
    classNames: componentOverrides.glass,
    defaultProps: { p: 'lg', shadow: 'card', withBorder: false, radius: 'xl' },
  }),

  Popover: Popover.extend({
    classNames: componentOverrides.dropdown,
  }),

  SegmentedControl: SegmentedControl.extend({
    classNames: componentOverrides.segmented,
    defaultProps: { radius: 'full' },
  }),

  Select: Select.extend({
    classNames: componentOverrides.combobox,
  }),

  Tabs: Tabs.extend({
    classNames: componentOverrides.tabs,
    defaultProps: { variant: 'pills', radius: 'full' },
  }),
};
