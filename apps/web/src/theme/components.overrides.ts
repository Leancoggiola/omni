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
  dropdown: {
    dropdown: styles.dropdown_solid,
  },
  glass: {
    root: styles.glass_root,
  },
  segmented: {
    root: styles.segmented_root,
    indicator: styles.segmented_indicator,
    label: styles.segmented_label,
  },
  combobox: {
    dropdown: styles.dropdown_solid,
    option: styles.combobox_option,
  },
  modal: {
    content: styles.modal_content,
    header: styles.modal_header,
    title: styles.modal_title,
  },
  navlink: {
    root: styles.navlink_root,
    label: styles.navlink_label,
  },
  tabs: {
    list: styles.tabs_list,
    tab: styles.tabs_tab,
  },
};
