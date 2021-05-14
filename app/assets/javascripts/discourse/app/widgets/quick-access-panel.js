import I18n from "I18n";
import { Promise } from "rsvp";
import Session from "discourse/models/session";
import { createWidget } from "discourse/widgets/widget";
import { h } from "virtual-dom";

/**
 * This tries to enforce a consistent flow of fetching, caching, refreshing,
 * and rendering for "quick access items".
 *
 * There are parts to introducing a new quick access panel:
 * 1. A user menu link that sends a `quickAccess` action, with a unique `type`.
 * 2. A `quick-access-${type}` widget, extended from `quick-access-panel`.
 */
export default createWidget("quick-access-panel", {
  tagName: "div.quick-access-panel",
  emptyStatePlaceholderItemKey: null,
  emptyStateWidget: null,

  buildKey: () => {
    throw Error('Cannot attach abstract widget "quick-access-panel".');
  },

  markReadRequest() {
    return Promise.resolve();
  },

  hideBottomItems() {
    return false;
  },

  hasUnread() {
    return false;
  },

  showAllHref() {
    return "";
  },

  findNewItems() {
    return Promise.resolve([]);
  },

  buildId() {
    return this.key;
  },

  buildAttributes() {
    const attributes = this.attrs;
    attributes["aria-labelledby"] = attributes.currentQuickAccess;
    attributes["tabindex"] = "0";
    attributes["role"] = "tabpanel";

    return attributes;
  },

  newItemsLoaded() {},

  itemHtml(item) {}, // eslint-disable-line no-unused-vars

  emptyStatePlaceholderItem() {
    if (this.emptyStatePlaceholderItemKey) {
      return h("li.read", I18n.t(this.emptyStatePlaceholderItemKey));
    } else if (this.emptyStateWidget) {
      return this.attach(this.emptyStateWidget);
    } else {
      return "";
    }
  },

  defaultState() {
    return { items: [], loading: false, loaded: false, error: false };
  },

  markRead() {
    return this.markReadRequest().then(() => {
      this.refreshNotifications();
    });
  },

  refreshNotifications() {
    if (this.state.loading) {
      return;
    }

    if (this.getItems().length === 0) {
      this.state.loading = true;
    }

    this.findNewItems()
      .then((newItems) => this.setItems(newItems))
      .catch(() => {
        this.setItems([]);
        this.state.error = true;
      })
      .finally(() => {
        this.state.loading = false;
        this.state.loaded = true;
        this.newItemsLoaded();
        this.sendWidgetAction("itemsLoaded", {
          hasUnread: this.hasUnread(),
          markRead: () => this.markRead(),
        });
        this.scheduleRerender();
      });
  },

  html(attrs, state) {
    if (!state.loaded) {
      this.refreshNotifications();
    }

    if (state.loading) {
      return [h("div.spinner-container", h("div.spinner"))];
    }

    let bottomItems = this.bottomItems();

    if (state.error) {
      return [
        this.attach("error-state"),
        h("div.panel-body-bottom", bottomItems),
      ];
    }

    const items = this.getItems().length
      ? this.getItems().map((item) => this.itemHtml(item))
      : [this.emptyStatePlaceholderItem()];

    return [h("ul", items), h("div.panel-body-bottom", bottomItems)];
  },

  bottomItems() {
    if (this.state.error) {
      const retryButton = this.attach("button", {
        title: "errors.buttons.again",
        icon: "sync",
        label: "errors.buttons.again",
        className: "btn btn-default show-all",
        action: "refreshNotifications",
      });
      return [retryButton];
    }

    const result = [];
    if (!this.hideBottomItems()) {
      const tab = I18n.t(this.attrs.titleKey).toLowerCase();

      result.push(
        // intentionally a link so it can be ctrl clicked
        this.attach("link", {
          title: "view_all",
          titleOptions: { tab },
          icon: "chevron-down",
          className: "btn btn-default btn-icon no-text show-all",
          "aria-label": "view_all",
          ariaLabelOptions: { tab },
          href: this.showAllHref(),
        })
      );
    }

    if (this.hasUnread()) {
      result.push(
        this.attach("button", {
          title: "user.dismiss_notifications_tooltip",
          icon: "check",
          label: "user.dismiss",
          className: "btn btn-default notifications-dismiss",
          action: "dismissNotifications",
        })
      );
    }

    return result;
  },

  getItems() {
    return Session.currentProp(`${this.key}-items`) || [];
  },

  setItems(newItems) {
    Session.currentProp(`${this.key}-items`, newItems);
  },
});
