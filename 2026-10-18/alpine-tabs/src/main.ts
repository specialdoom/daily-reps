import Alpine from "alpinejs";

interface Tab {
  id: string;
  label: string;
  content: string;
  disabled?: boolean;
}

const tabs: Tab[] = [
  { id: "profile", label: "Profile", content: "Name, avatar and bio." },
  { id: "security", label: "Security", content: "Password and two-factor authentication." },
  { id: "billing", label: "Billing", content: "Plan, invoices and payment methods.", disabled: true },
  { id: "notifications", label: "Notifications", content: "Email and push preferences." },
];

Alpine.data("tabs", () => ({
  tabs,
  selected: "profile",

  select(id: string) {
    this.selected = id;
  },

  // TODO: your work starts here.
}));

Alpine.start();
