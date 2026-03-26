export interface PaletteColor {
  name: string;
  code: string;
  hex: string;
  enabled: boolean;
}

export const PALETTE: PaletteColor[] = [
  { name: "White", code: "01", hex: "#F2F2F2", enabled: true },
  { name: "Light Grey", code: "light_grey", hex: "#D6D6D6", enabled: true },
  { name: "Light Bluish Gray", code: "194", hex: "#A7A9AC", enabled: true },
  { name: "Dark Bluish Gray", code: "199", hex: "#4A4F57", enabled: true },
  { name: "Black Grey", code: "A29", hex: "#2C2C2C", enabled: true },
  { name: "Black", code: "26", hex: "#1A1A1A", enabled: true },

  { name: "Tan", code: "05", hex: "#D8C58A", enabled: true },
  { name: "Dark Tan", code: "138", hex: "#B8A06A", enabled: true },
  { name: "Nougat", code: "18", hex: "#C68642", enabled: true },
  { name: "Medium Nougat", code: "312", hex: "#B07A3C", enabled: true },
  { name: "Light Nougat", code: "283", hex: "#E4B692", enabled: true },
  { name: "Light Light Nougat", code: "A08", hex: "#F1D1B5", enabled: true },
  { name: "Apricot", code: "A24", hex: "#E6B178", enabled: true },
  { name: "Flesh Nougat", code: "A25", hex: "#D29A5A", enabled: true },
  { name: "Reddish Brown", code: "192", hex: "#7A3E2E", enabled: true },
  { name: "Dark Brown", code: "308", hex: "#4A2C2A", enabled: true },

  { name: "Dark Red", code: "154", hex: "#8B1E1E", enabled: true },
  { name: "Red", code: "21", hex: "#C91A09", enabled: true },
  { name: "Coral", code: "353", hex: "#F05050", enabled: true },
  { name: "Peach Red", code: "S10", hex: "#E0527D", enabled: true },
  { name: "Dark Pink", code: "221", hex: "#C55486", enabled: true },
  { name: "Bright Pink", code: "222", hex: "#E57AA8", enabled: true },
  { name: "Magenta", code: "124", hex: "#D62F7A", enabled: true },

  { name: "Yellow", code: "24", hex: "#F2D500", enabled: true },
  { name: "Flame Yellowish Orange", code: "191", hex: "#F2A11C", enabled: true },
  { name: "Orange", code: "106", hex: "#F47C20", enabled: true },
  { name: "Dark Orange", code: "38", hex: "#C86A1E", enabled: true },

  { name: "Dark Green", code: "141", hex: "#1F4D2E", enabled: true },
  { name: "Green", code: "28", hex: "#2F8F4A", enabled: true },
  { name: "Bright Green", code: "37", hex: "#3FB34A", enabled: true },
  { name: "Yellowish Green", code: "326", hex: "#9FE34A", enabled: true },
  { name: "Olive Green", code: "330", hex: "#7A8F3A", enabled: true },
  { name: "Sand Green", code: "151", hex: "#7FAF9C", enabled: true },
  { name: "Dark Turquoise", code: "107", hex: "#1F8F8A", enabled: true },

  { name: "Dark Blue", code: "140", hex: "#1F3A6D", enabled: true },
  { name: "Blue", code: "23", hex: "#1F5FBF", enabled: true },
  { name: "Dark Azure", code: "321", hex: "#2F7FB5", enabled: true },
  { name: "Medium Blue", code: "102", hex: "#5A9BD5", enabled: true },
  { name: "Bright Light Blue", code: "212", hex: "#8FB9E3", enabled: true },
  { name: "Sand Blue", code: "135", hex: "#6F8FA6", enabled: true },
  { name: "Medium Azure", code: "322", hex: "#2FA4B8", enabled: true },
  { name: "Light Aqua", code: "323", hex: "#7EDFD6", enabled: true },

  { name: "Dark Purple", code: "268", hex: "#4B2E83", enabled: true },
  { name: "Purple", code: "A13", hex: "#6F58B6", enabled: true },
  { name: "Medium Lavender", code: "324", hex: "#8B6CC4", enabled: true },
  { name: "Lavender", code: "325", hex: "#A89BD6", enabled: true },

  { name: "Gold", code: "127", hex: "#C79A2E", enabled: true },
  { name: "Pearl Gold", code: "297", hex: "#D4A017", enabled: true },
];
