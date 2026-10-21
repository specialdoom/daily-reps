import Alpine from "alpinejs";

interface Tab {
  id: string;
  label: string;
  content: string;
  disabled?: boolean;
}

const tabs: Tab[] = [
  { id: "profile", label: "Profile", content: "Name, avatar and bio." },
  {
    id: "security",
    label: "Security",
    content: "Password and two-factor authentication.",
  },
  {
    id: "billing",
    label: "Billing",
    content: "Plan, invoices and payment methods.",
    disabled: true,
  },
  {
    id: "notifications",
    label: "Notifications",
    content: "Email and push preferences.",
  },
];

Alpine.data("tabs", () => ({
  tabs,
  selected: "profile",

  select(id: string) {
    this.selected = id;
  },

  keydown(event: KeyboardEvent) {
    const handledEvents = ["ArrowRight", "ArrowLeft", "Home", "End"];

    if (handledEvents.includes(event.key)) {
      event.preventDefault();
    }

    switch (event.key) {
      case "ArrowRight": {
        this.selectNextAvailableTab(1);
        break;
      }
      case "ArrowLeft": {
        this.selectNextAvailableTab(-1);
        break;
      }
      case "End": {
        this.selectNextAvailableTab(-1, this.tabs.length - 1);
        break;
      }
      case "Home": {
        this.selectNextAvailableTab(1, 0);
        break;
      }
    }
  },

  selectNextAvailableTab(direction: 1 | -1, start?: number) {
    let selectedIndex = this.tabs.findIndex((tab) => tab.id === this.selected);
    let startingIndex =
      start ?? (direction === 1 ? selectedIndex + 1 : selectedIndex - 1);

    if (selectedIndex === this.tabs.length - 1 && direction === 1) {
      startingIndex = 0;
    } else if (selectedIndex === 0 && direction === -1) {
      startingIndex = this.tabs.length - 1;
    }

    if (direction === 1) {
      for (let i = startingIndex; i < this.tabs.length; i++) {
        if (tabs[i].disabled) {
          continue;
        } else {
          selectedIndex = i;
          break;
        }
      }
    } else {
      for (let i = startingIndex; i >= 0; i--) {
        if (tabs[i].disabled) {
          continue;
        } else {
          selectedIndex = i;
          break;
        }
      }
    }

    const nextTab = this.tabs[selectedIndex];

    this.selected = nextTab.id;
  },

  // TODO: your work starts here.
}));

Alpine.start();
