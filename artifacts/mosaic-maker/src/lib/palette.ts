export type ColorFamily =
  | "neutral"
  | "skin"
  | "brown"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "cyan"
  | "purple"
  | "pink"
  | "metallic";

export interface PaletteColor {
  name: string;
  code: string;
  hex: string;
  enabled: boolean;
  family: ColorFamily;
}

export const PALETTE: PaletteColor[] = [
  {
    name: "White",
    code: "01",
    hex: "#F2F2F2",
    enabled: true,
    family: "neutral",
  },
  {
    name: "Light Grey",
    code: "light_grey",
    hex: "#D6D6D6",
    enabled: true,
    family: "neutral",
  },
  {
    name: "Light Bluish Gray",
    code: "194",
    hex: "#A7A9AC",
    enabled: true,
    family: "neutral",
  },
  {
    name: "Dark Bluish Gray",
    code: "199",
    hex: "#4A4F57",
    enabled: true,
    family: "neutral",
  },
  {
    name: "Black Grey",
    code: "A29",
    hex: "#2C2C2C",
    enabled: true,
    family: "neutral",
  },
  {
    name: "Black",
    code: "26",
    hex: "#1A1A1A",
    enabled: true,
    family: "neutral",
  },

  { name: "Tan", code: "05", hex: "#D8C58A", enabled: true, family: "skin" },
  {
    name: "Dark Tan",
    code: "138",
    hex: "#B8A06A",
    enabled: true,
    family: "skin",
  },
  { name: "Nougat", code: "18", hex: "#C68642", enabled: true, family: "skin" },
  {
    name: "Medium Nougat",
    code: "312",
    hex: "#B07A3C",
    enabled: true,
    family: "skin",
  },
  {
    name: "Light Nougat",
    code: "283",
    hex: "#E4B692",
    enabled: true,
    family: "skin",
  },
  {
    name: "Light Light Nougat",
    code: "A08",
    hex: "#F1D1B5",
    enabled: true,
    family: "skin",
  },
  {
    name: "Apricot",
    code: "A24",
    hex: "#E6B178",
    enabled: true,
    family: "skin",
  },
  {
    name: "Flesh Nougat",
    code: "A25",
    hex: "#D29A5A",
    enabled: true,
    family: "skin",
  },

  {
    name: "Reddish Brown",
    code: "192",
    hex: "#7A3E2E",
    enabled: true,
    family: "brown",
  },
  {
    name: "Dark Brown",
    code: "308",
    hex: "#4A2C2A",
    enabled: true,
    family: "brown",
  },

  {
    name: "Dark Red",
    code: "154",
    hex: "#8B1E1E",
    enabled: true,
    family: "red",
  },
  { name: "Red", code: "21", hex: "#C91A09", enabled: true, family: "red" },
  { name: "Coral", code: "353", hex: "#F05050", enabled: true, family: "red" },

  {
    name: "Peach Red",
    code: "S10",
    hex: "#E0527D",
    enabled: true,
    family: "pink",
  },
  {
    name: "Dark Pink",
    code: "221",
    hex: "#C55486",
    enabled: true,
    family: "pink",
  },
  {
    name: "Bright Pink",
    code: "222",
    hex: "#E57AA8",
    enabled: true,
    family: "pink",
  },
  {
    name: "Magenta",
    code: "124",
    hex: "#D62F7A",
    enabled: true,
    family: "pink",
  },

  {
    name: "Yellow",
    code: "24",
    hex: "#F2D500",
    enabled: true,
    family: "yellow",
  },
  {
    name: "Light Yellow",
    code: "LY1",
    hex: "#F8E28A",
    enabled: true,
    family: "yellow",
  },
  {
    name: "Medium Yellow",
    code: "MY1",
    hex: "#E5C400",
    enabled: true,
    family: "yellow",
  },

  {
    name: "Flame Yellowish Orange",
    code: "191",
    hex: "#F2A11C",
    enabled: true,
    family: "orange",
  },
  {
    name: "Orange",
    code: "106",
    hex: "#F47C20",
    enabled: true,
    family: "orange",
  },
  {
    name: "Dark Orange",
    code: "38",
    hex: "#C86A1E",
    enabled: true,
    family: "orange",
  },

  {
    name: "Dark Green",
    code: "141",
    hex: "#1F4D2E",
    enabled: true,
    family: "green",
  },
  { name: "Green", code: "28", hex: "#2F8F4A", enabled: true, family: "green" },
  {
    name: "Bright Green",
    code: "37",
    hex: "#3FB34A",
    enabled: true,
    family: "green",
  },
  {
    name: "Yellowish Green",
    code: "326",
    hex: "#9FE34A",
    enabled: true,
    family: "green",
  },
  {
    name: "Olive Green",
    code: "330",
    hex: "#7A8F3A",
    enabled: true,
    family: "green",
  },
  {
    name: "Sand Green",
    code: "151",
    hex: "#7FAF9C",
    enabled: true,
    family: "green",
  },

  {
    name: "Dark Turquoise",
    code: "107",
    hex: "#1F8F8A",
    enabled: true,
    family: "cyan",
  },

  {
    name: "Dark Blue",
    code: "140",
    hex: "#1F3A6D",
    enabled: true,
    family: "blue",
  },
  { name: "Blue", code: "23", hex: "#1F5FBF", enabled: true, family: "blue" },
  {
    name: "Dark Azure",
    code: "321",
    hex: "#2F7FB5",
    enabled: true,
    family: "blue",
  },
  {
    name: "Medium Blue",
    code: "102",
    hex: "#5A9BD5",
    enabled: true,
    family: "blue",
  },
  {
    name: "Bright Light Blue",
    code: "212",
    hex: "#8FB9E3",
    enabled: true,
    family: "blue",
  },
  {
    name: "Sand Blue",
    code: "135",
    hex: "#6F8FA6",
    enabled: true,
    family: "blue",
  },

  {
    name: "Medium Azure",
    code: "322",
    hex: "#2FA4B8",
    enabled: true,
    family: "cyan",
  },
  {
    name: "Light Aqua",
    code: "323",
    hex: "#7EDFD6",
    enabled: true,
    family: "cyan",
  },

  {
    name: "Dark Purple",
    code: "268",
    hex: "#4B2E83",
    enabled: true,
    family: "purple",
  },
  {
    name: "Purple",
    code: "A13",
    hex: "#6F58B6",
    enabled: true,
    family: "purple",
  },
  {
    name: "Medium Lavender",
    code: "324",
    hex: "#8B6CC4",
    enabled: true,
    family: "purple",
  },
  {
    name: "Lavender",
    code: "325",
    hex: "#A89BD6",
    enabled: true,
    family: "purple",
  },

  {
    name: "Gold",
    code: "127",
    hex: "#C79A2E",
    enabled: true,
    family: "metallic",
  },
  {
    name: "Pearl Gold",
    code: "297",
    hex: "#D4A017",
    enabled: true,
    family: "metallic",
  },
];
