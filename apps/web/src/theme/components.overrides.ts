import styles from './components.module.scss';

export const componentOverrides = {
  actionIcon: {
    root: styles.action_icon_root,
  },
  alert: {
    body: styles.alert_body,
  },

  appShell: {
    navbar: styles.appshell_navbar,
  },
  combobox: {
    root: styles.combobox_root,
    option: styles.combobox_option,
  },
  modal: {
    content: styles.modal_content,
    header: styles.modal_header,
  },
  navlink: {
    root: styles.navlink_root,
    label: styles.navlink_label,
  },
  tabs: {
    tab: styles.tabs_tab,
  },
};
