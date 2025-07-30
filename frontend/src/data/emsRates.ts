export interface EMSShippingRate {
  id: string;
  destination_country: string;
  documents_up_to_500g_eur: number | null;
  documents_over_500g_up_to_1000g_eur: number | null;
  goods_up_to_500g_eur: number | null;
  goods_over_500g_up_to_1000g_eur: number | null;
  goods_each_subsequent_kg_eur: number | null;
}

// EMS shipping rates data (extracted from ems-shipping-rates.json)
export const emsShippingRates: EMSShippingRate[] = [
  {
    id: "1",
    destination_country: "Australia",
    documents_up_to_500g_eur: 32.00,
    documents_over_500g_up_to_1000g_eur: 40.31,
    goods_up_to_500g_eur: 32.59,
    goods_over_500g_up_to_1000g_eur: 40.88,
    goods_each_subsequent_kg_eur: 16.60
  },
  {
    id: "2",
    destination_country: "Austria",
    documents_up_to_500g_eur: 18.85,
    documents_over_500g_up_to_1000g_eur: 20.26,
    goods_up_to_500g_eur: 19.32,
    goods_over_500g_up_to_1000g_eur: 20.72,
    goods_each_subsequent_kg_eur: 2.82
  },
  {
    id: "18",
    destination_country: "Belgium",
    documents_up_to_500g_eur: 18.16,
    documents_over_500g_up_to_1000g_eur: 19.57,
    goods_up_to_500g_eur: 18.51,
    goods_over_500g_up_to_1000g_eur: 20.12,
    goods_each_subsequent_kg_eur: 3.00
  },
  {
    id: "26",
    destination_country: "Brazil",
    documents_up_to_500g_eur: 28.68,
    documents_over_500g_up_to_1000g_eur: 37.09,
    goods_up_to_500g_eur: 28.68,
    goods_over_500g_up_to_1000g_eur: 37.53,
    goods_each_subsequent_kg_eur: 15.79
  },
  {
    id: "79",
    destination_country: "Canada",
    documents_up_to_500g_eur: 20.16,
    documents_over_500g_up_to_1000g_eur: 25.62,
    goods_up_to_500g_eur: 20.69,
    goods_over_500g_up_to_1000g_eur: 26.25,
    goods_each_subsequent_kg_eur: 12.37
  },
  {
    id: "85",
    destination_country: "China",
    documents_up_to_500g_eur: 12.24,
    documents_over_500g_up_to_1000g_eur: 17.16,
    goods_up_to_500g_eur: 13.13,
    goods_over_500g_up_to_1000g_eur: 17.34,
    goods_each_subsequent_kg_eur: 7.71
  },
  {
    id: "52",
    destination_country: "Denmark",
    documents_up_to_500g_eur: 25.47,
    documents_over_500g_up_to_1000g_eur: 26.66,
    goods_up_to_500g_eur: 26.06,
    goods_over_500g_up_to_1000g_eur: 27.25,
    goods_each_subsequent_kg_eur: 3.03
  },
  {
    id: "189",
    destination_country: "France",
    documents_up_to_500g_eur: 16.09,
    documents_over_500g_up_to_1000g_eur: 18.01,
    goods_up_to_500g_eur: 18.84,
    goods_over_500g_up_to_1000g_eur: 20.28,
    goods_each_subsequent_kg_eur: 3.88
  },
  {
    id: "48",
    destination_country: "Germany",
    documents_up_to_500g_eur: 30.28,
    documents_over_500g_up_to_1000g_eur: 31.72,
    goods_up_to_500g_eur: 30.75,
    goods_over_500g_up_to_1000g_eur: 32.18,
    goods_each_subsequent_kg_eur: 2.76
  },
  {
    id: "63",
    destination_country: "India",
    documents_up_to_500g_eur: 18.72,
    documents_over_500g_up_to_1000g_eur: 21.21,
    goods_up_to_500g_eur: 20.28,
    goods_over_500g_up_to_1000g_eur: 22.50,
    goods_each_subsequent_kg_eur: 7.10
  },
  {
    id: "72",
    destination_country: "Italy",
    documents_up_to_500g_eur: 20.12,
    documents_over_500g_up_to_1000g_eur: 21.50,
    goods_up_to_500g_eur: 20.81,
    goods_over_500g_up_to_1000g_eur: 21.78,
    goods_each_subsequent_kg_eur: 2.94
  },
  {
    id: "207",
    destination_country: "Japan",
    documents_up_to_500g_eur: 28.87,
    documents_over_500g_up_to_1000g_eur: 33.51,
    goods_up_to_500g_eur: 29.34,
    goods_over_500g_up_to_1000g_eur: 33.97,
    goods_each_subsequent_kg_eur: 8.35
  },
  {
    id: "125",
    destination_country: "Netherlands",
    documents_up_to_500g_eur: 18.31,
    documents_over_500g_up_to_1000g_eur: 19.63,
    goods_up_to_500g_eur: 18.78,
    goods_over_500g_up_to_1000g_eur: 20.09,
    goods_each_subsequent_kg_eur: 2.38
  },
  {
    id: "132",
    destination_country: "Norway",
    documents_up_to_500g_eur: 30.49,
    documents_over_500g_up_to_1000g_eur: 31.69,
    goods_up_to_500g_eur: 31.81,
    goods_over_500g_up_to_1000g_eur: 32.54,
    goods_each_subsequent_kg_eur: 3.49
  },
  {
    id: "140",
    destination_country: "Poland",
    documents_up_to_500g_eur: 15.60,
    documents_over_500g_up_to_1000g_eur: 16.69,
    goods_up_to_500g_eur: 16.53,
    goods_over_500g_up_to_1000g_eur: 17.56,
    goods_each_subsequent_kg_eur: 1.26
  },
  {
    id: "142",
    destination_country: "Russian Federation",
    documents_up_to_500g_eur: 18.31,
    documents_over_500g_up_to_1000g_eur: 18.74,
    goods_up_to_500g_eur: 21.40,
    goods_over_500g_up_to_1000g_eur: 21.82,
    goods_each_subsequent_kg_eur: 1.25
  },
  {
    id: "70",
    destination_country: "Spain",
    documents_up_to_500g_eur: 27.79,
    documents_over_500g_up_to_1000g_eur: 27.99,
    goods_up_to_500g_eur: 27.94,
    goods_over_500g_up_to_1000g_eur: 28.57,
    goods_each_subsequent_kg_eur: 3.96
  },
  {
    id: "198",
    destination_country: "Sweden",
    documents_up_to_500g_eur: 27.09,
    documents_over_500g_up_to_1000g_eur: 28.62,
    goods_up_to_500g_eur: 27.68,
    goods_over_500g_up_to_1000g_eur: 29.19,
    goods_each_subsequent_kg_eur: 3.01
  },
  {
    id: "197",
    destination_country: "Switzerland",
    documents_up_to_500g_eur: 24.66,
    documents_over_500g_up_to_1000g_eur: 25.94,
    goods_up_to_500g_eur: 25.37,
    goods_over_500g_up_to_1000g_eur: 26.66,
    goods_each_subsequent_kg_eur: 3.00
  },
  {
    id: "33",
    destination_country: "United Kingdom of Great Britain and Northern Ireland",
    documents_up_to_500g_eur: 25.97,
    documents_over_500g_up_to_1000g_eur: 28.57,
    goods_up_to_500g_eur: 29.37,
    goods_over_500g_up_to_1000g_eur: 31.99,
    goods_each_subsequent_kg_eur: 5.24
  },
  {
    id: "169",
    destination_country: "USA (United States)",
    documents_up_to_500g_eur: 48.46,
    documents_over_500g_up_to_1000g_eur: 52.60,
    goods_up_to_500g_eur: 49.04,
    goods_over_500g_up_to_1000g_eur: 53.19,
    goods_each_subsequent_kg_eur: 8.31
  }
];

export const EMS_ADDITIONAL_CHARGES = {
  customsClearanceFeeEur: 2.41,
  declaredValueFeePercentage: 0.03 // 3.0%
};
