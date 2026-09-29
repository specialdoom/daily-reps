import { ComboboxOption, createCombobox } from "../combobox.js";

const options: ComboboxOption<string>[] = [
  {
    id: "1",
    value: "Apple",
    label: "apple",
  },
  {
    id: "2",
    value: "Pear",
    label: "pear",
  },
];
const combobox = createCombobox({ source: options, id: "combobox-1" });
