// EMS shipping calculator with embedded data

export interface EMSShippingRate {
  id: string;
  destination_country: string;
  documents_up_to_500g_eur: number | null;
  documents_over_500g_up_to_1000g_eur: number | null;
  goods_up_to_500g_eur: number | null;
  goods_over_500g_up_to_1000g_eur: number | null;
  goods_each_subsequent_kg_eur: number | null;
}

// Full EMS shipping rates from the provided JSON file
const emsShippingRates: EMSShippingRate[] = [
  {
    "id": "1",
    "destination_country": "Australia",
    "documents_up_to_500g_eur": 32.00,
    "documents_over_500g_up_to_1000g_eur": 40.31,
    "goods_up_to_500g_eur": 32.59,
    "goods_over_500g_up_to_1000g_eur": 40.88,
    "goods_each_subsequent_kg_eur": 16.60
  },
  {
    "id": "2",
    "destination_country": "Austria",
    "documents_up_to_500g_eur": 18.85,
    "documents_over_500g_up_to_1000g_eur": 20.26,
    "goods_up_to_500g_eur": 19.32,
    "goods_over_500g_up_to_1000g_eur": 20.72,
    "goods_each_subsequent_kg_eur": 2.82
  },
  {
    "id": "3",
    "destination_country": "Azerbaijan",
    "documents_up_to_500g_eur": 19.25,
    "documents_over_500g_up_to_1000g_eur": 20.31,
    "goods_up_to_500g_eur": 19.81,
    "goods_over_500g_up_to_1000g_eur": 21.59,
    "goods_each_subsequent_kg_eur": 2.25
  },
  {
    "id": "4",
    "destination_country": "Albania",
    "documents_up_to_500g_eur": 19.21,
    "documents_over_500g_up_to_1000g_eur": 23.53,
    "goods_up_to_500g_eur": 19.97,
    "goods_over_500g_up_to_1000g_eur": 24.44,
    "goods_each_subsequent_kg_eur": 7.50
  },
  {
    "id": "5",
    "destination_country": "Algeria",
    "documents_up_to_500g_eur": 18.47,
    "documents_over_500g_up_to_1000g_eur": 21.91,
    "goods_up_to_500g_eur": 19.34,
    "goods_over_500g_up_to_1000g_eur": 22.63,
    "goods_each_subsequent_kg_eur": 7.00
  },
  {
    "id": "6",
    "destination_country": "Anguilla",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "7",
    "destination_country": "Angola",
    "documents_up_to_500g_eur": 16.99,
    "documents_over_500g_up_to_1000g_eur": 22.96,
    "goods_up_to_500g_eur": 17.43,
    "goods_over_500g_up_to_1000g_eur": 23.90,
    "goods_each_subsequent_kg_eur": 11.50
  },
  {
    "id": "8",
    "destination_country": "Antigua and Barbuda",
    "documents_up_to_500g_eur": 14.00,
    "documents_over_500g_up_to_1000g_eur": 19.28,
    "goods_up_to_500g_eur": 16.04,
    "goods_over_500g_up_to_1000g_eur": 21.12,
    "goods_each_subsequent_kg_eur": 10.60
  },
  {
    "id": "9",
    "destination_country": "Argentina",
    "documents_up_to_500g_eur": 25.37,
    "documents_over_500g_up_to_1000g_eur": 31.54,
    "goods_up_to_500g_eur": 30.65,
    "goods_over_500g_up_to_1000g_eur": 36.82,
    "goods_each_subsequent_kg_eur": 13.53
  },
  {
    "id": "10",
    "destination_country": "Armenia",
    "documents_up_to_500g_eur": 22.19,
    "documents_over_500g_up_to_1000g_eur": 24.13,
    "goods_up_to_500g_eur": 26.81,
    "goods_over_500g_up_to_1000g_eur": 28.74,
    "goods_each_subsequent_kg_eur": 4.12
  },
  {
    "id": "11",
    "destination_country": "Aruba",
    "documents_up_to_500g_eur": 25.01,
    "documents_over_500g_up_to_1000g_eur": 31.76,
    "goods_up_to_500g_eur": 25.94,
    "goods_over_500g_up_to_1000g_eur": 31.88,
    "goods_each_subsequent_kg_eur": 11.66
  },
  {
    "id": "12",
    "destination_country": "Afghanistan",
    "documents_up_to_500g_eur": 20.28,
    "documents_over_500g_up_to_1000g_eur": 22.40,
    "goods_up_to_500g_eur": 20.91,
    "goods_over_500g_up_to_1000g_eur": 22.60,
    "goods_each_subsequent_kg_eur": 4.50
  },
  {
    "id": "13",
    "destination_country": "Bahamas",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "14",
    "destination_country": "Bangladesh",
    "documents_up_to_500g_eur": 18.35,
    "documents_over_500g_up_to_1000g_eur": 21.16,
    "goods_up_to_500g_eur": 20.96,
    "goods_over_500g_up_to_1000g_eur": 23.76,
    "goods_each_subsequent_kg_eur": 7.00
  },
  {
    "id": "15",
    "destination_country": "Barbados",
    "documents_up_to_500g_eur": 21.21,
    "documents_over_500g_up_to_1000g_eur": 25.91,
    "goods_up_to_500g_eur": 21.97,
    "goods_over_500g_up_to_1000g_eur": 26.76,
    "goods_each_subsequent_kg_eur": 9.18
  },
  {
    "id": "16",
    "destination_country": "Bahrain",
    "documents_up_to_500g_eur": 21.60,
    "documents_over_500g_up_to_1000g_eur": 25.68,
    "goods_up_to_500g_eur": 22.54,
    "goods_over_500g_up_to_1000g_eur": 26.57,
    "goods_each_subsequent_kg_eur": 8.00
  },
  {
    "id": "17",
    "destination_country": "Belize",
    "documents_up_to_500g_eur": 24.24,
    "documents_over_500g_up_to_1000g_eur": 29.94,
    "goods_up_to_500g_eur": 25.04,
    "goods_over_500g_up_to_1000g_eur": 30.56,
    "goods_each_subsequent_kg_eur": 12.07
  },
  {
    "id": "18",
    "destination_country": "Belgium",
    "documents_up_to_500g_eur": 18.16,
    "documents_over_500g_up_to_1000g_eur": 19.57,
    "goods_up_to_500g_eur": 18.51,
    "goods_over_500g_up_to_1000g_eur": 20.12,
    "goods_each_subsequent_kg_eur": 3.00
  },
  {
    "id": "19",
    "destination_country": "Benin",
    "documents_up_to_500g_eur": 25.32,
    "documents_over_500g_up_to_1000g_eur": 30.49,
    "goods_up_to_500g_eur": 26.22,
    "goods_over_500g_up_to_1000g_eur": 31.29,
    "goods_each_subsequent_kg_eur": 10.07
  },
  {
    "id": "20",
    "destination_country": "Bermuda",
    "documents_up_to_500g_eur": 14.68,
    "documents_over_500g_up_to_1000g_eur": 18.91,
    "goods_up_to_500g_eur": 15.26,
    "goods_over_500g_up_to_1000g_eur": 19.49,
    "goods_each_subsequent_kg_eur": 8.46
  },
  {
    "id": "21",
    "destination_country": "Bonaire, Sint Eustatius, and Saba (the former Antilles)",
    "documents_up_to_500g_eur": 22.26,
    "documents_over_500g_up_to_1000g_eur": 29.16,
    "goods_up_to_500g_eur": 23.34,
    "goods_over_500g_up_to_1000g_eur": 29.65,
    "goods_each_subsequent_kg_eur": 13.96
  },
  {
    "id": "22",
    "destination_country": "Bulgaria",
    "documents_up_to_500g_eur": 17.57,
    "documents_over_500g_up_to_1000g_eur": 20.13,
    "goods_up_to_500g_eur": 18.03,
    "goods_over_500g_up_to_1000g_eur": 20.57,
    "goods_each_subsequent_kg_eur": 4.13
  },
  {
    "id": "23",
    "destination_country": "Bolivia",
    "documents_up_to_500g_eur": 21.75,
    "documents_over_500g_up_to_1000g_eur": 28.47,
    "goods_up_to_500g_eur": 22.35,
    "goods_over_500g_up_to_1000g_eur": 28.49,
    "goods_each_subsequent_kg_eur": 14.10
  },
  {
    "id": "24",
    "destination_country": "Bosnia-Herzegovina",
    "documents_up_to_500g_eur": 17.53,
    "documents_over_500g_up_to_1000g_eur": 20.16,
    "goods_up_to_500g_eur": 18.13,
    "goods_over_500g_up_to_1000g_eur": 20.75,
    "goods_each_subsequent_kg_eur": 5.54
  },
  {
    "id": "25",
    "destination_country": "Botswana",
    "documents_up_to_500g_eur": 25.40,
    "documents_over_500g_up_to_1000g_eur": 28.68,
    "goods_up_to_500g_eur": 26.10,
    "goods_over_500g_up_to_1000g_eur": 29.53,
    "goods_each_subsequent_kg_eur": 10.81
  },
  {
    "id": "26",
    "destination_country": "Brazil",
    "documents_up_to_500g_eur": 28.68,
    "documents_over_500g_up_to_1000g_eur": 37.09,
    "goods_up_to_500g_eur": 28.68,
    "goods_over_500g_up_to_1000g_eur": 37.53,
    "goods_each_subsequent_kg_eur": 15.79
  },
  {
    "id": "27",
    "destination_country": "Brunei Darussalam",
    "documents_up_to_500g_eur": 13.82,
    "documents_over_500g_up_to_1000g_eur": 18.81,
    "goods_up_to_500g_eur": 16.04,
    "goods_over_500g_up_to_1000g_eur": 21.12,
    "goods_each_subsequent_kg_eur": 9.99
  },
  {
    "id": "28",
    "destination_country": "Burkina Faso",
    "documents_up_to_500g_eur": 20.01,
    "documents_over_500g_up_to_1000g_eur": 26.57,
    "goods_up_to_500g_eur": 20.65,
    "goods_over_500g_up_to_1000g_eur": 26.88,
    "goods_each_subsequent_kg_eur": 11.69
  },
  {
    "id": "29",
    "destination_country": "Burundi",
    "documents_up_to_500g_eur": 25.18,
    "documents_over_500g_up_to_1000g_eur": 29.81,
    "goods_up_to_500g_eur": 25.63,
    "goods_over_500g_up_to_1000g_eur": 30.25,
    "goods_each_subsequent_kg_eur": 10.25
  },
  {
    "id": "30",
    "destination_country": "Bhutan",
    "documents_up_to_500g_eur": 23.28,
    "documents_over_500g_up_to_1000g_eur": 28.81,
    "goods_up_to_500g_eur": 23.75,
    "goods_over_500g_up_to_1000g_eur": 29.28,
    "goods_each_subsequent_kg_eur": 12.87
  },
  {
    "id": "31",
    "destination_country": "Vanuatu",
    "documents_up_to_500g_eur": 21.04,
    "documents_over_500g_up_to_1000g_eur": 29.13,
    "goods_up_to_500g_eur": 23.82,
    "goods_over_500g_up_to_1000g_eur": 32.54,
    "goods_each_subsequent_kg_eur": 16.15
  },
  {
    "id": "32",
    "destination_country": "Vatican",
    "documents_up_to_500g_eur": 19.71,
    "documents_over_500g_up_to_1000g_eur": 22.81,
    "goods_up_to_500g_eur": 20.47,
    "goods_over_500g_up_to_1000g_eur": 23.74,
    "goods_each_subsequent_kg_eur": 3.12
  },
  {
    "id": "33",
    "destination_country": "United Kingdom",
    "documents_up_to_500g_eur": 25.97,
    "documents_over_500g_up_to_1000g_eur": 28.57,
    "goods_up_to_500g_eur": 29.37,
    "goods_over_500g_up_to_1000g_eur": 31.99,
    "goods_each_subsequent_kg_eur": 5.24
  },
  {
    "id": "34",
    "destination_country": "Virgin Islands, British",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "35",
    "destination_country": "Guernsey",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "36",
    "destination_country": "Jersey",
    "documents_up_to_500g_eur": 31.09,
    "documents_over_500g_up_to_1000g_eur": 32.87,
    "goods_up_to_500g_eur": 31.60,
    "goods_over_500g_up_to_1000g_eur": 33.69,
    "goods_each_subsequent_kg_eur": 9.19
  },
  {
    "id": "37",
    "destination_country": "Gibraltar",
    "documents_up_to_500g_eur": 43.99,
    "documents_over_500g_up_to_1000g_eur": 49.91,
    "goods_up_to_500g_eur": 43.99,
    "goods_over_500g_up_to_1000g_eur": 50.01,
    "goods_each_subsequent_kg_eur": 16.62
  },
  {
    "id": "38",
    "destination_country": "Hungary",
    "documents_up_to_500g_eur": 20.28,
    "documents_over_500g_up_to_1000g_eur": 22.49,
    "goods_up_to_500g_eur": 21.03,
    "goods_over_500g_up_to_1000g_eur": 22.94,
    "goods_each_subsequent_kg_eur": 2.71
  },
  {
    "id": "39",
    "destination_country": "Venezuela",
    "documents_up_to_500g_eur": 25.18,
    "documents_over_500g_up_to_1000g_eur": 29.99,
    "goods_up_to_500g_eur": 25.75,
    "goods_over_500g_up_to_1000g_eur": 30.97,
    "goods_each_subsequent_kg_eur": 10.25
  },
  {
    "id": "40",
    "destination_country": "Vietnam",
    "documents_up_to_500g_eur": 19.96,
    "documents_over_500g_up_to_1000g_eur": 22.24,
    "goods_up_to_500g_eur": 20.16,
    "goods_over_500g_up_to_1000g_eur": 23.26,
    "goods_each_subsequent_kg_eur": 5.49
  },
  {
    "id": "41",
    "destination_country": "Gabon",
    "documents_up_to_500g_eur": 21.01,
    "documents_over_500g_up_to_1000g_eur": 27.49,
    "goods_up_to_500g_eur": 21.94,
    "goods_over_500g_up_to_1000g_eur": 28.40,
    "goods_each_subsequent_kg_eur": 12.65
  },
  {
    "id": "42",
    "destination_country": "Haiti",
    "documents_up_to_500g_eur": 16.60,
    "documents_over_500g_up_to_1000g_eur": 22.31,
    "goods_up_to_500g_eur": 17.06,
    "goods_over_500g_up_to_1000g_eur": 22.76,
    "goods_each_subsequent_kg_eur": 11.43
  },
  {
    "id": "43",
    "destination_country": "Guyana",
    "documents_up_to_500g_eur": 26.51,
    "documents_over_500g_up_to_1000g_eur": 32.81,
    "goods_up_to_500g_eur": 26.97,
    "goods_over_500g_up_to_1000g_eur": 33.28,
    "goods_each_subsequent_kg_eur": 13.03
  },
  {
    "id": "44",
    "destination_country": "Gambia",
    "documents_up_to_500g_eur": 20.21,
    "documents_over_500g_up_to_1000g_eur": 24.51,
    "goods_up_to_500g_eur": 23.46,
    "goods_over_500g_up_to_1000g_eur": 28.46,
    "goods_each_subsequent_kg_eur": 9.69
  },
  {
    "id": "45",
    "destination_country": "Ghana",
    "documents_up_to_500g_eur": 24.84,
    "documents_over_500g_up_to_1000g_eur": 29.43,
    "goods_up_to_500g_eur": 26.10,
    "goods_over_500g_up_to_1000g_eur": 30.72,
    "goods_each_subsequent_kg_eur": 9.18
  },
  {
    "id": "46",
    "destination_country": "Guatemala",
    "documents_up_to_500g_eur": 17.40,
    "documents_over_500g_up_to_1000g_eur": 23.79,
    "goods_up_to_500g_eur": 17.84,
    "goods_over_500g_up_to_1000g_eur": 24.62,
    "goods_each_subsequent_kg_eur": 11.46
  },
  {
    "id": "47",
    "destination_country": "Guinea",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "48",
    "destination_country": "Germany",
    "documents_up_to_500g_eur": 30.28,
    "documents_over_500g_up_to_1000g_eur": 31.72,
    "goods_up_to_500g_eur": 30.75,
    "goods_over_500g_up_to_1000g_eur": 32.18,
    "goods_each_subsequent_kg_eur": 2.76
  },
  {
    "id": "49",
    "destination_country": "Grenada",
    "documents_up_to_500g_eur": 15.72,
    "documents_over_500g_up_to_1000g_eur": 20.96,
    "goods_up_to_500g_eur": 16.26,
    "goods_over_500g_up_to_1000g_eur": 21.59,
    "goods_each_subsequent_kg_eur": 10.13
  },
  {
    "id": "50",
    "destination_country": "Greece",
    "documents_up_to_500g_eur": 21.28,
    "documents_over_500g_up_to_1000g_eur": 23.03,
    "goods_up_to_500g_eur": 22.03,
    "goods_over_500g_up_to_1000g_eur": 23.44,
    "goods_each_subsequent_kg_eur": 4.26
  },
  {
    "id": "51",
    "destination_country": "Georgia",
    "documents_up_to_500g_eur": 19.18,
    "documents_over_500g_up_to_1000g_eur": 19.79,
    "goods_up_to_500g_eur": 20.03,
    "goods_over_500g_up_to_1000g_eur": 21.01,
    "goods_each_subsequent_kg_eur": 1.75
  },
  {
    "id": "52",
    "destination_country": "Denmark",
    "documents_up_to_500g_eur": 25.47,
    "documents_over_500g_up_to_1000g_eur": 26.66,
    "goods_up_to_500g_eur": 26.06,
    "goods_over_500g_up_to_1000g_eur": 27.25,
    "goods_each_subsequent_kg_eur": 3.03
  },
  {
    "id": "53",
    "destination_country": "Greenland",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "54",
    "destination_country": "Faroe Islands",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "55",
    "destination_country": "Democratic Republic of the Congo",
    "documents_up_to_500g_eur": 24.74,
    "documents_over_500g_up_to_1000g_eur": 31.29,
    "goods_up_to_500g_eur": 25.35,
    "goods_over_500g_up_to_1000g_eur": 31.66,
    "goods_each_subsequent_kg_eur": 12.84
  },
  {
    "id": "56",
    "destination_country": "Djibouti",
    "documents_up_to_500g_eur": 24.74,
    "documents_over_500g_up_to_1000g_eur": 30.76,
    "goods_up_to_500g_eur": 24.94,
    "goods_over_500g_up_to_1000g_eur": 30.76,
    "goods_each_subsequent_kg_eur": 12.84
  },
  {
    "id": "57",
    "destination_country": "Dominica",
    "documents_up_to_500g_eur": 29.84,
    "documents_over_500g_up_to_1000g_eur": 44.81,
    "goods_up_to_500g_eur": 30.43,
    "goods_over_500g_up_to_1000g_eur": 45.38,
    "goods_each_subsequent_kg_eur": 29.93
  },
  {
    "id": "58",
    "destination_country": "Dominican Republic",
    "documents_up_to_500g_eur": 21.57,
    "documents_over_500g_up_to_1000g_eur": 26.26,
    "goods_up_to_500g_eur": 22.19,
    "goods_over_500g_up_to_1000g_eur": 27.13,
    "goods_each_subsequent_kg_eur": 11.84
  },
  {
    "id": "59",
    "destination_country": "Egypt",
    "documents_up_to_500g_eur": 17.78,
    "documents_over_500g_up_to_1000g_eur": 20.96,
    "goods_up_to_500g_eur": 18.66,
    "goods_over_500g_up_to_1000g_eur": 21.90,
    "goods_each_subsequent_kg_eur": 5.29
  },
  {
    "id": "60",
    "destination_country": "Zambia",
    "documents_up_to_500g_eur": 20.12,
    "documents_over_500g_up_to_1000g_eur": 25.34,
    "goods_up_to_500g_eur": 20.69,
    "goods_over_500g_up_to_1000g_eur": 25.91,
    "goods_each_subsequent_kg_eur": 10.46
  },
  {
    "id": "61",
    "destination_country": "Zimbabwe",
    "documents_up_to_500g_eur": 20.03,
    "documents_over_500g_up_to_1000g_eur": 25.06,
    "goods_up_to_500g_eur": 20.66,
    "goods_over_500g_up_to_1000g_eur": 25.68,
    "goods_each_subsequent_kg_eur": 10.19
  },
  {
    "id": "62",
    "destination_country": "Israel",
    "documents_up_to_500g_eur": 21.18,
    "documents_over_500g_up_to_1000g_eur": 24.12,
    "goods_up_to_500g_eur": 21.78,
    "goods_over_500g_up_to_1000g_eur": 24.74,
    "goods_each_subsequent_kg_eur": 4.63
  },
  {
    "id": "63",
    "destination_country": "India",
    "documents_up_to_500g_eur": 18.72,
    "documents_over_500g_up_to_1000g_eur": 21.21,
    "goods_up_to_500g_eur": 20.28,
    "goods_over_500g_up_to_1000g_eur": 22.50,
    "goods_each_subsequent_kg_eur": 7.10
  },
  {
    "id": "64",
    "destination_country": "Indonesia",
    "documents_up_to_500g_eur": 18.37,
    "documents_over_500g_up_to_1000g_eur": 20.50,
    "goods_up_to_500g_eur": 20.29,
    "goods_over_500g_up_to_1000g_eur": 22.43,
    "goods_each_subsequent_kg_eur": 5.34
  },
  {
    "id": "65",
    "destination_country": "Jordan",
    "documents_up_to_500g_eur": 21.60,
    "documents_over_500g_up_to_1000g_eur": 25.68,
    "goods_up_to_500g_eur": 22.54,
    "goods_over_500g_up_to_1000g_eur": 26.34,
    "goods_each_subsequent_kg_eur": 5.22
  },
  {
    "id": "66",
    "destination_country": "Iraq",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "67",
    "destination_country": "Iran (Islamic Rep.)",
    "documents_up_to_500g_eur": 21.53,
    "documents_over_500g_up_to_1000g_eur": 24.87,
    "goods_up_to_500g_eur": 22.13,
    "goods_over_500g_up_to_1000g_eur": 25.57,
    "goods_each_subsequent_kg_eur": 7.10
  },
  {
    "id": "68",
    "destination_country": "Ireland",
    "documents_up_to_500g_eur": 22.29,
    "documents_over_500g_up_to_1000g_eur": 24.81,
    "goods_up_to_500g_eur": 22.90,
    "goods_over_500g_up_to_1000g_eur": 25.41,
    "goods_each_subsequent_kg_eur": 3.87
  },
  {
    "id": "69",
    "destination_country": "Iceland",
    "documents_up_to_500g_eur": 31.47,
    "documents_over_500g_up_to_1000g_eur": 34.09,
    "goods_up_to_500g_eur": 32.10,
    "goods_over_500g_up_to_1000g_eur": 34.71,
    "goods_each_subsequent_kg_eur": 5.49
  },
  {
    "id": "70",
    "destination_country": "Spain",
    "documents_up_to_500g_eur": 27.79,
    "documents_over_500g_up_to_1000g_eur": 27.99,
    "goods_up_to_500g_eur": 27.94,
    "goods_over_500g_up_to_1000g_eur": 28.57,
    "goods_each_subsequent_kg_eur": 3.96
  },
  {
    "id": "71",
    "destination_country": "Canary Islands",
    "documents_up_to_500g_eur": 26.79,
    "documents_over_500g_up_to_1000g_eur": 27.99,
    "goods_up_to_500g_eur": 27.74,
    "goods_over_500g_up_to_1000g_eur": 28.68,
    "goods_each_subsequent_kg_eur": 3.96
  },
  {
    "id": "72",
    "destination_country": "Italy",
    "documents_up_to_500g_eur": 20.12,
    "documents_over_500g_up_to_1000g_eur": 21.50,
    "goods_up_to_500g_eur": 20.81,
    "goods_over_500g_up_to_1000g_eur": 21.78,
    "goods_each_subsequent_kg_eur": 2.94
  },
  {
    "id": "73",
    "destination_country": "Yemen",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "74",
    "destination_country": "Cape Verde",
    "documents_up_to_500g_eur": 21.44,
    "documents_over_500g_up_to_1000g_eur": 27.99,
    "goods_up_to_500g_eur": 22.01,
    "goods_over_500g_up_to_1000g_eur": 28.56,
    "goods_each_subsequent_kg_eur": 13.10
  },
  {
    "id": "75",
    "destination_country": "Kazakhstan",
    "documents_up_to_500g_eur": 21.60,
    "documents_over_500g_up_to_1000g_eur": 22.63,
    "goods_up_to_500g_eur": 22.06,
    "goods_over_500g_up_to_1000g_eur": 23.09,
    "goods_each_subsequent_kg_eur": 2.54
  },
  {
    "id": "76",
    "destination_country": "Cayman Islands",
    "documents_up_to_500g_eur": 19.46,
    "documents_over_500g_up_to_1000g_eur": 25.22,
    "goods_up_to_500g_eur": 21.56,
    "goods_over_500g_up_to_1000g_eur": 25.28,
    "goods_each_subsequent_kg_eur": 9.15
  },
  {
    "id": "77",
    "destination_country": "Cambodia",
    "documents_up_to_500g_eur": 14.79,
    "documents_over_500g_up_to_1000g_eur": 19.37,
    "goods_up_to_500g_eur": 17.31,
    "goods_over_500g_up_to_1000g_eur": 21.90,
    "goods_each_subsequent_kg_eur": 10.18
  },
  {
    "id": "78",
    "destination_country": "Cameroon",
    "documents_up_to_500g_eur": 20.07,
    "documents_over_500g_up_to_1000g_eur": 23.90,
    "goods_up_to_500g_eur": 20.65,
    "goods_over_500g_up_to_1000g_eur": 24.49,
    "goods_each_subsequent_kg_eur": 8.57
  },
  {
    "id": "79",
    "destination_country": "Canada",
    "documents_up_to_500g_eur": 20.16,
    "documents_over_500g_up_to_1000g_eur": 25.62,
    "goods_up_to_500g_eur": 20.69,
    "goods_over_500g_up_to_1000g_eur": 26.25,
    "goods_each_subsequent_kg_eur": 12.37
  },
  {
    "id": "80",
    "destination_country": "Qatar",
    "documents_up_to_500g_eur": 22.12,
    "documents_over_500g_up_to_1000g_eur": 26.43,
    "goods_up_to_500g_eur": 22.57,
    "goods_over_500g_up_to_1000g_eur": 26.88,
    "goods_each_subsequent_kg_eur": 9.09
  },
  {
    "id": "81",
    "destination_country": "Kenya",
    "documents_up_to_500g_eur": 22.51,
    "documents_over_500g_up_to_1000g_eur": 26.01,
    "goods_up_to_500g_eur": 23.26,
    "goods_over_500g_up_to_1000g_eur": 26.84,
    "goods_each_subsequent_kg_eur": 4.56
  },
  {
    "id": "82",
    "destination_country": "Cyprus",
    "documents_up_to_500g_eur": 19.57,
    "documents_over_500g_up_to_1000g_eur": 22.10,
    "goods_up_to_500g_eur": 20.18,
    "goods_over_500g_up_to_1000g_eur": 22.71,
    "goods_each_subsequent_kg_eur": 4.82
  },
  {
    "id": "83",
    "destination_country": "Kyrgyzstan",
    "documents_up_to_500g_eur": 20.38,
    "documents_over_500g_up_to_1000g_eur": 22.40,
    "goods_up_to_500g_eur": 21.21,
    "goods_over_500g_up_to_1000g_eur": 23.15,
    "goods_each_subsequent_kg_eur": 2.99
  },
  {
    "id": "84",
    "destination_country": "Kiribati",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "85",
    "destination_country": "China",
    "documents_up_to_500g_eur": 12.24,
    "documents_over_500g_up_to_1000g_eur": 17.16,
    "goods_up_to_500g_eur": 13.13,
    "goods_over_500g_up_to_1000g_eur": 17.34,
    "goods_each_subsequent_kg_eur": 7.71
  },
  {
    "id": "86",
    "destination_country": "Hong Kong",
    "documents_up_to_500g_eur": 22.59,
    "documents_over_500g_up_to_1000g_eur": 27.57,
    "goods_up_to_500g_eur": 27.60,
    "goods_over_500g_up_to_1000g_eur": 31.28,
    "goods_each_subsequent_kg_eur": 7.37
  },
  {
    "id": "87",
    "destination_country": "Taiwan",
    "documents_up_to_500g_eur": 14.41,
    "documents_over_500g_up_to_1000g_eur": 18.03,
    "goods_up_to_500g_eur": 14.81,
    "goods_over_500g_up_to_1000g_eur": 18.54,
    "goods_each_subsequent_kg_eur": 7.40
  },
  {
    "id": "88",
    "destination_country": "Colombia",
    "documents_up_to_500g_eur": 19.76,
    "documents_over_500g_up_to_1000g_eur": 24.94,
    "goods_up_to_500g_eur": 20.65,
    "goods_over_500g_up_to_1000g_eur": 25.87,
    "goods_each_subsequent_kg_eur": 11.65
  },
  {
    "id": "89",
    "destination_country": "Comoros",
    "documents_up_to_500g_eur": 18.46,
    "documents_over_500g_up_to_1000g_eur": 23.22,
    "goods_up_to_500g_eur": 19.19,
    "goods_over_500g_up_to_1000g_eur": 23.97,
    "goods_each_subsequent_kg_eur": 9.38
  },
  {
    "id": "90",
    "destination_country": "Congo (Dem. Rep.)",
    "documents_up_to_500g_eur": 16.78,
    "documents_over_500g_up_to_1000g_eur": 22.93,
    "goods_up_to_500g_eur": 17.65,
    "goods_over_500g_up_to_1000g_eur": 23.10,
    "goods_each_subsequent_kg_eur": 9.84
  },
  {
    "id": "91",
    "destination_country": "North Korea",
    "documents_up_to_500g_eur": 18.90,
    "documents_over_500g_up_to_1000g_eur": 22.76,
    "goods_up_to_500g_eur": 19.37,
    "goods_over_500g_up_to_1000g_eur": 23.22,
    "goods_each_subsequent_kg_eur": 7.31
  },
  {
    "id": "92",
    "destination_country": "Kosovo",
    "documents_up_to_500g_eur": 18.03,
    "documents_over_500g_up_to_1000g_eur": 21.88,
    "goods_up_to_500g_eur": 18.21,
    "goods_over_500g_up_to_1000g_eur": 22.37,
    "goods_each_subsequent_kg_eur": 7.32
  },
  {
    "id": "93",
    "destination_country": "Costa Rica",
    "documents_up_to_500g_eur": 20.59,
    "documents_over_500g_up_to_1000g_eur": 25.93,
    "goods_up_to_500g_eur": 21.29,
    "goods_over_500g_up_to_1000g_eur": 26.65,
    "goods_each_subsequent_kg_eur": 9.90
  },
  {
    "id": "94",
    "destination_country": "Côte d'Ivoire",
    "documents_up_to_500g_eur": 19.65,
    "documents_over_500g_up_to_1000g_eur": 25.94,
    "goods_up_to_500g_eur": 20.41,
    "goods_over_500g_up_to_1000g_eur": 26.37,
    "goods_each_subsequent_kg_eur": 12.63
  },
  {
    "id": "95",
    "destination_country": "Cuba",
    "documents_up_to_500g_eur": 22.35,
    "documents_over_500g_up_to_1000g_eur": 27.13,
    "goods_up_to_500g_eur": 22.94,
    "goods_over_500g_up_to_1000g_eur": 27.72,
    "goods_each_subsequent_kg_eur": 12.60
  },
  {
    "id": "96",
    "destination_country": "Kuwait",
    "documents_up_to_500g_eur": 17.56,
    "documents_over_500g_up_to_1000g_eur": 22.00,
    "goods_up_to_500g_eur": 18.21,
    "goods_over_500g_up_to_1000g_eur": 22.54,
    "goods_each_subsequent_kg_eur": 6.97
  },
  {
    "id": "97",
    "destination_country": "Curaçao",
    "documents_up_to_500g_eur": 25.04,
    "documents_over_500g_up_to_1000g_eur": 32.18,
    "goods_up_to_500g_eur": 25.50,
    "goods_over_500g_up_to_1000g_eur": 32.18,
    "goods_each_subsequent_kg_eur": 15.66
  },
  {
    "id": "98",
    "destination_country": "Laos",
    "documents_up_to_500g_eur": 20.03,
    "documents_over_500g_up_to_1000g_eur": 24.44,
    "goods_up_to_500g_eur": 20.65,
    "goods_over_500g_up_to_1000g_eur": 25.04,
    "goods_each_subsequent_kg_eur": 8.40
  },
  {
    "id": "99",
    "destination_country": "Latvia",
    "documents_up_to_500g_eur": 17.66,
    "documents_over_500g_up_to_1000g_eur": 18.90,
    "goods_up_to_500g_eur": 18.12,
    "goods_over_500g_up_to_1000g_eur": 19.35,
    "goods_each_subsequent_kg_eur": 2.74
  },
  {
    "id": "100",
    "destination_country": "Lesotho",
    "documents_up_to_500g_eur": 20.16,
    "documents_over_500g_up_to_1000g_eur": 24.65,
    "goods_up_to_500g_eur": 20.66,
    "goods_over_500g_up_to_1000g_eur": 25.09,
    "goods_each_subsequent_kg_eur": 9.62
  },
  {
    "id": "101",
    "destination_country": "Liberia",
    "documents_up_to_500g_eur": 16.31,
    "documents_over_500g_up_to_1000g_eur": 20.41,
    "goods_up_to_500g_eur": 16.88,
    "goods_over_500g_up_to_1000g_eur": 20.99,
    "goods_each_subsequent_kg_eur": 8.22
  },
  {
    "id": "102",
    "destination_country": "Lebanon",
    "documents_up_to_500g_eur": 19.21,
    "documents_over_500g_up_to_1000g_eur": 21.68,
    "goods_up_to_500g_eur": 19.41,
    "goods_over_500g_up_to_1000g_eur": 21.68,
    "goods_each_subsequent_kg_eur": 8.31
  },
  {
    "id": "103",
    "destination_country": "Libya",
    "documents_up_to_500g_eur": 21.74,
    "documents_over_500g_up_to_1000g_eur": 24.93,
    "goods_up_to_500g_eur": 22.46,
    "goods_over_500g_up_to_1000g_eur": 25.66,
    "goods_each_subsequent_kg_eur": 6.40
  },
  {
    "id": "104",
    "destination_country": "Lithuania",
    "documents_up_to_500g_eur": 17.18,
    "documents_over_500g_up_to_1000g_eur": 17.41,
    "goods_up_to_500g_eur": 17.41,
    "goods_over_500g_up_to_1000g_eur": 17.78,
    "goods_each_subsequent_kg_eur": 1.25
  },
  {
    "id": "105",
    "destination_country": "Liechtenstein",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "106",
    "destination_country": "Luxembourg",
    "documents_up_to_500g_eur": 16.90,
    "documents_over_500g_up_to_1000g_eur": 17.88,
    "goods_up_to_500g_eur": 17.50,
    "goods_over_500g_up_to_1000g_eur": 18.53,
    "goods_each_subsequent_kg_eur": 3.03
  },
  {
    "id": "107",
    "destination_country": "Mauritius",
    "documents_up_to_500g_eur": 21.59,
    "documents_over_500g_up_to_1000g_eur": 26.54,
    "goods_up_to_500g_eur": 21.91,
    "goods_over_500g_up_to_1000g_eur": 26.85,
    "goods_each_subsequent_kg_eur": 10.71
  },
  {
    "id": "108",
    "destination_country": "Mauritania",
    "documents_up_to_500g_eur": 24.16,
    "documents_over_500g_up_to_1000g_eur": 30.57,
    "goods_up_to_500g_eur": 24.94,
    "goods_over_500g_up_to_1000g_eur": 31.38,
    "goods_each_subsequent_kg_eur": 14.07
  },
  {
    "id": "109",
    "destination_country": "Madagascar",
    "documents_up_to_500g_eur": 26.62,
    "documents_over_500g_up_to_1000g_eur": 31.84,
    "goods_up_to_500g_eur": 27.10,
    "goods_over_500g_up_to_1000g_eur": 31.84,
    "goods_each_subsequent_kg_eur": 9.99
  },
  {
    "id": "110",
    "destination_country": "Macao",
    "documents_up_to_500g_eur": 22.31,
    "documents_over_500g_up_to_1000g_eur": 25.00,
    "goods_up_to_500g_eur": 24.06,
    "goods_over_500g_up_to_1000g_eur": 28.07,
    "goods_each_subsequent_kg_eur": 9.71
  },
  {
    "id": "111",
    "destination_country": "North Macedonia",
    "documents_up_to_500g_eur": 18.85,
    "documents_over_500g_up_to_1000g_eur": 22.66,
    "goods_up_to_500g_eur": 19.32,
    "goods_over_500g_up_to_1000g_eur": 23.13,
    "goods_each_subsequent_kg_eur": 7.63
  },
  {
    "id": "112",
    "destination_country": "Malawi",
    "documents_up_to_500g_eur": 20.99,
    "documents_over_500g_up_to_1000g_eur": 26.21,
    "goods_up_to_500g_eur": 22.54,
    "goods_over_500g_up_to_1000g_eur": 26.79,
    "goods_each_subsequent_kg_eur": 10.87
  },
  {
    "id": "113",
    "destination_country": "Malaysia",
    "documents_up_to_500g_eur": 24.56,
    "documents_over_500g_up_to_1000g_eur": 27.65,
    "goods_up_to_500g_eur": 25.18,
    "goods_over_500g_up_to_1000g_eur": 28.13,
    "goods_each_subsequent_kg_eur": 4.29
  },
  {
    "id": "114",
    "destination_country": "Mali",
    "documents_up_to_500g_eur": 17.29,
    "documents_over_500g_up_to_1000g_eur": 22.93,
    "goods_up_to_500g_eur": 17.94,
    "goods_over_500g_up_to_1000g_eur": 23.50,
    "goods_each_subsequent_kg_eur": 12.57
  },
  {
    "id": "115",
    "destination_country": "Maldives",
    "documents_up_to_500g_eur": 17.62,
    "documents_over_500g_up_to_1000g_eur": 20.18,
    "goods_up_to_500g_eur": 18.07,
    "goods_over_500g_up_to_1000g_eur": 20.65,
    "goods_each_subsequent_kg_eur": 4.28
  },
  {
    "id": "116",
    "destination_country": "Malta",
    "documents_up_to_500g_eur": 19.72,
    "documents_over_500g_up_to_1000g_eur": 23.10,
    "goods_up_to_500g_eur": 20.46,
    "goods_over_500g_up_to_1000g_eur": 23.43,
    "goods_each_subsequent_kg_eur": 6.29
  },
  {
    "id": "117",
    "destination_country": "Morocco",
    "documents_up_to_500g_eur": 22.01,
    "documents_over_500g_up_to_1000g_eur": 26.12,
    "goods_up_to_500g_eur": 22.91,
    "goods_over_500g_up_to_1000g_eur": 27.00,
    "goods_each_subsequent_kg_eur": 8.62
  },
  {
    "id": "118",
    "destination_country": "Mexico",
    "documents_up_to_500g_eur": 27.35,
    "documents_over_500g_up_to_1000g_eur": 32.97,
    "goods_up_to_500g_eur": 27.94,
    "goods_over_500g_up_to_1000g_eur": 33.56,
    "goods_each_subsequent_kg_eur": 11.24
  },
  {
    "id": "119",
    "destination_country": "Mozambique",
    "documents_up_to_500g_eur": 20.94,
    "documents_over_500g_up_to_1000g_eur": 25.44,
    "goods_up_to_500g_eur": 21.38,
    "goods_over_500g_up_to_1000g_eur": 25.91,
    "goods_each_subsequent_kg_eur": 9.04
  },
  {
    "id": "120",
    "destination_country": "Moldova",
    "documents_up_to_500g_eur": 22.13,
    "documents_over_500g_up_to_1000g_eur": 25.88,
    "goods_up_to_500g_eur": 22.57,
    "goods_over_500g_up_to_1000g_eur": 25.88,
    "goods_each_subsequent_kg_eur": 4.54
  },
  {
    "id": "121",
    "destination_country": "Monaco",
    "documents_up_to_500g_eur": 18.65,
    "documents_over_500g_up_to_1000g_eur": 19.15,
    "goods_up_to_500g_eur": 19.16,
    "goods_over_500g_up_to_1000g_eur": 19.76,
    "goods_each_subsequent_kg_eur": 3.06
  },
  {
    "id": "122",
    "destination_country": "Mongolia",
    "documents_up_to_500g_eur": 24.54,
    "documents_over_500g_up_to_1000g_eur": 28.84,
    "goods_up_to_500g_eur": 26.38,
    "goods_over_500g_up_to_1000g_eur": 30.90,
    "goods_each_subsequent_kg_eur": 9.93
  },
  {
    "id": "123",
    "destination_country": "Myanmar",
    "documents_up_to_500g_eur": 14.93,
    "documents_over_500g_up_to_1000g_eur": 19.60,
    "goods_up_to_500g_eur": 21.16,
    "goods_over_500g_up_to_1000g_eur": 25.40,
    "goods_each_subsequent_kg_eur": 8.91
  },
  {
    "id": "124",
    "destination_country": "Namibia",
    "documents_up_to_500g_eur": 16.90,
    "documents_over_500g_up_to_1000g_eur": 21.53,
    "goods_up_to_500g_eur": 17.46,
    "goods_over_500g_up_to_1000g_eur": 22.44,
    "goods_each_subsequent_kg_eur": 10.43
  },
  {
    "id": "125",
    "destination_country": "Netherlands",
    "documents_up_to_500g_eur": 18.31,
    "documents_over_500g_up_to_1000g_eur": 19.63,
    "goods_up_to_500g_eur": 18.78,
    "goods_over_500g_up_to_1000g_eur": 20.09,
    "goods_each_subsequent_kg_eur": 2.38
  },
  {
    "id": "126",
    "destination_country": "Nepal",
    "documents_up_to_500g_eur": 15.34,
    "documents_over_500g_up_to_1000g_eur": 18.49,
    "goods_up_to_500g_eur": 15.93,
    "goods_over_500g_up_to_1000g_eur": 19.07,
    "goods_each_subsequent_kg_eur": 6.63
  },
  {
    "id": "127",
    "destination_country": "Niger",
    "documents_up_to_500g_eur": 21.01,
    "documents_over_500g_up_to_1000g_eur": 29.34,
    "goods_up_to_500g_eur": 21.93,
    "goods_over_500g_up_to_1000g_eur": 29.34,
    "goods_each_subsequent_kg_eur": 15.94
  },
  {
    "id": "128",
    "destination_country": "Nigeria",
    "documents_up_to_500g_eur": 19.57,
    "documents_over_500g_up_to_1000g_eur": 23.57,
    "goods_up_to_500g_eur": 20.15,
    "goods_over_500g_up_to_1000g_eur": 24.16,
    "goods_each_subsequent_kg_eur": 9.21
  },
  {
    "id": "129",
    "destination_country": "Nicaragua",
    "documents_up_to_500g_eur": 18.46,
    "documents_over_500g_up_to_1000g_eur": 24.63,
    "goods_up_to_500g_eur": 18.90,
    "goods_over_500g_up_to_1000g_eur": 25.07,
    "goods_each_subsequent_kg_eur": 11.69
  },
  {
    "id": "130",
    "destination_country": "New Zealand",
    "documents_up_to_500g_eur": 20.22,
    "documents_over_500g_up_to_1000g_eur": 28.24,
    "goods_up_to_500g_eur": 20.81,
    "goods_over_500g_up_to_1000g_eur": 28.82,
    "goods_each_subsequent_kg_eur": 16.03
  },
  {
    "id": "131",
    "destination_country": "New Caledonia",
    "documents_up_to_500g_eur": 32.35,
    "documents_over_500g_up_to_1000g_eur": 38.00,
    "goods_up_to_500g_eur": 33.07,
    "goods_over_500g_up_to_1000g_eur": 38.68,
    "goods_each_subsequent_kg_eur": 11.21
  },
  {
    "id": "132",
    "destination_country": "Norway",
    "documents_up_to_500g_eur": 30.49,
    "documents_over_500g_up_to_1000g_eur": 31.69,
    "goods_up_to_500g_eur": 31.81,
    "goods_over_500g_up_to_1000g_eur": 32.54,
    "goods_each_subsequent_kg_eur": 3.49
  },
  {
    "id": "133",
    "destination_country": "United Arab Emirates",
    "documents_up_to_500g_eur": 22.13,
    "documents_over_500g_up_to_1000g_eur": 25.68,
    "goods_up_to_500g_eur": 22.91,
    "goods_over_500g_up_to_1000g_eur": 26.59,
    "goods_each_subsequent_kg_eur": 6.78
  },
  {
    "id": "134",
    "destination_country": "Oman",
    "documents_up_to_500g_eur": 21.74,
    "documents_over_500g_up_to_1000g_eur": 24.31,
    "goods_up_to_500g_eur": 22.19,
    "goods_over_500g_up_to_1000g_eur": 24.76,
    "goods_each_subsequent_kg_eur": 4.91
  },
  {
    "id": "135",
    "destination_country": "Pakistan",
    "documents_up_to_500g_eur": 17.60,
    "documents_over_500g_up_to_1000g_eur": 20.16,
    "goods_up_to_500g_eur": 18.21,
    "goods_over_500g_up_to_1000g_eur": 20.94,
    "goods_each_subsequent_kg_eur": 5.76
  },
  {
    "id": "136",
    "destination_country": "Panama",
    "documents_up_to_500g_eur": 24.97,
    "documents_over_500g_up_to_1000g_eur": 29.50,
    "goods_up_to_500g_eur": 25.82,
    "goods_over_500g_up_to_1000g_eur": 29.93,
    "goods_each_subsequent_kg_eur": 10.68
  },
  {
    "id": "137",
    "destination_country": "Papua New Guinea",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "138",
    "destination_country": "Paraguay",
    "documents_up_to_500g_eur": 21.26,
    "documents_over_500g_up_to_1000g_eur": 28.37,
    "goods_up_to_500g_eur": 21.97,
    "goods_over_500g_up_to_1000g_eur": 29.10,
    "goods_each_subsequent_kg_eur": 13.44
  },
  {
    "id": "139",
    "destination_country": "Peru",
    "documents_up_to_500g_eur": 24.10,
    "documents_over_500g_up_to_1000g_eur": 30.03,
    "goods_up_to_500g_eur": 24.91,
    "goods_over_500g_up_to_1000g_eur": 30.41,
    "goods_each_subsequent_kg_eur": 12.24
  },
  {
    "id": "140",
    "destination_country": "Poland",
    "documents_up_to_500g_eur": 15.60,
    "documents_over_500g_up_to_1000g_eur": 16.69,
    "goods_up_to_500g_eur": 16.53,
    "goods_over_500g_up_to_1000g_eur": 17.56,
    "goods_each_subsequent_kg_eur": 1.26
  },
  {
    "id": "141",
    "destination_country": "Portugal",
    "documents_up_to_500g_eur": 15.66,
    "documents_over_500g_up_to_1000g_eur": 17.56,
    "goods_up_to_500g_eur": 16.35,
    "goods_over_500g_up_to_1000g_eur": 19.12,
    "goods_each_subsequent_kg_eur": 4.01
  },
  {
    "id": "142",
    "destination_country": "Russia",
    "documents_up_to_500g_eur": 18.31,
    "documents_over_500g_up_to_1000g_eur": 18.74,
    "goods_up_to_500g_eur": 21.40,
    "goods_over_500g_up_to_1000g_eur": 21.82,
    "goods_each_subsequent_kg_eur": 1.25
  },
  {
    "id": "143",
    "destination_country": "Moscow",
    "documents_up_to_500g_eur": 12.29,
    "documents_over_500g_up_to_1000g_eur": 12.65,
    "goods_up_to_500g_eur": 12.88,
    "goods_over_500g_up_to_1000g_eur": 13.25,
    "goods_each_subsequent_kg_eur": 0.88
  },
  {
    "id": "144",
    "destination_country": "Moscow Region",
    "documents_up_to_500g_eur": 15.79,
    "documents_over_500g_up_to_1000g_eur": 16.15,
    "goods_up_to_500g_eur": 16.37,
    "goods_over_500g_up_to_1000g_eur": 16.72,
    "goods_each_subsequent_kg_eur": 0.88
  },
  {
    "id": "145",
    "destination_country": "Saint Petersburg",
    "documents_up_to_500g_eur": 12.93,
    "documents_over_500g_up_to_1000g_eur": 12.56,
    "goods_up_to_500g_eur": 13.12,
    "goods_over_500g_up_to_1000g_eur": 13.50,
    "goods_each_subsequent_kg_eur": 0.88
  },
  {
    "id": "146",
    "destination_country": "Leningradsky District",
    "documents_up_to_500g_eur": 17.93,
    "documents_over_500g_up_to_1000g_eur": 18.28,
    "goods_up_to_500g_eur": 18.51,
    "goods_over_500g_up_to_1000g_eur": 19.01,
    "goods_each_subsequent_kg_eur": 0.88
  },
  {
    "id": "147",
    "destination_country": "Rwanda",
    "documents_up_to_500g_eur": 21.04,
    "documents_over_500g_up_to_1000g_eur": 26.01,
    "goods_up_to_500g_eur": 21.97,
    "goods_over_500g_up_to_1000g_eur": 26.96,
    "goods_each_subsequent_kg_eur": 8.47
  },
  {
    "id": "148",
    "destination_country": "Romania",
    "documents_up_to_500g_eur": 21.85,
    "documents_over_500g_up_to_1000g_eur": 23.41,
    "goods_up_to_500g_eur": 22.57,
    "goods_over_500g_up_to_1000g_eur": 24.12,
    "goods_each_subsequent_kg_eur": 4.40
  },
  {
    "id": "149",
    "destination_country": "El Salvador",
    "documents_up_to_500g_eur": 32.10,
    "documents_over_500g_up_to_1000g_eur": 37.26,
    "goods_up_to_500g_eur": 32.69,
    "goods_over_500g_up_to_1000g_eur": 37.84,
    "goods_each_subsequent_kg_eur": 14.50
  },
  {
    "id": "150",
    "destination_country": "Samoa",
    "documents_up_to_500g_eur": 21.62,
    "documents_over_500g_up_to_1000g_eur": 30.51,
    "goods_up_to_500g_eur": 23.60,
    "goods_over_500g_up_to_1000g_eur": 31.78,
    "goods_each_subsequent_kg_eur": 18.18
  },
  {
    "id": "151",
    "destination_country": "San Marino",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "152",
    "destination_country": "Sao Tome and Principe",
    "documents_up_to_500g_eur": 21.10,
    "documents_over_500g_up_to_1000g_eur": 28.81,
    "goods_up_to_500g_eur": 21.99,
    "goods_over_500g_up_to_1000g_eur": 28.81,
    "goods_each_subsequent_kg_eur": 13.37
  },
  {
    "id": "153",
    "destination_country": "Saudi Arabia",
    "documents_up_to_500g_eur": 24.50,
    "documents_over_500g_up_to_1000g_eur": 28.44,
    "goods_up_to_500g_eur": 24.97,
    "goods_over_500g_up_to_1000g_eur": 28.91,
    "goods_each_subsequent_kg_eur": 7.10
  },
  {
    "id": "154",
    "destination_country": "Eswatini",
    "documents_up_to_500g_eur": 16.74,
    "documents_over_500g_up_to_1000g_eur": 21.81,
    "goods_up_to_500g_eur": 17.16,
    "goods_over_500g_up_to_1000g_eur": 22.43,
    "goods_each_subsequent_kg_eur": 10.46
  },
  {
    "id": "155",
    "destination_country": "Seychelles",
    "documents_up_to_500g_eur": 18.16,
    "documents_over_500g_up_to_1000g_eur": 21.44,
    "goods_up_to_500g_eur": 20.09,
    "goods_over_500g_up_to_1000g_eur": 24.54,
    "goods_each_subsequent_kg_eur": 6.57
  },
  {
    "id": "156",
    "destination_country": "Senegal",
    "documents_up_to_500g_eur": 21.15,
    "documents_over_500g_up_to_1000g_eur": 27.41,
    "goods_up_to_500g_eur": 21.74,
    "goods_over_500g_up_to_1000g_eur": 27.99,
    "goods_each_subsequent_kg_eur": 12.54
  },
  {
    "id": "157",
    "destination_country": "Saint Vincent and the Grenadines",
    "documents_up_to_500g_eur": 29.43,
    "documents_over_500g_up_to_1000g_eur": 43.97,
    "goods_up_to_500g_eur": 31.51,
    "goods_over_500g_up_to_1000g_eur": 46.78,
    "goods_each_subsequent_kg_eur": 29.09
  },
  {
    "id": "158",
    "destination_country": "Saint Kitts and Nevis",
    "documents_up_to_500g_eur": 75.66,
    "documents_over_500g_up_to_1000g_eur": 86.44,
    "goods_up_to_500g_eur": 76.12,
    "goods_over_500g_up_to_1000g_eur": 86.90,
    "goods_each_subsequent_kg_eur": 43.82
  },
  {
    "id": "159",
    "destination_country": "Saint Lucia",
    "documents_up_to_500g_eur": 20.68,
    "documents_over_500g_up_to_1000g_eur": 25.74,
    "goods_up_to_500g_eur": 21.37,
    "goods_over_500g_up_to_1000g_eur": 26.38,
    "goods_each_subsequent_kg_eur": 10.38
  },
  {
    "id": "160",
    "destination_country": "Sint Maarten",
    "documents_up_to_500g_eur": 19.44,
    "documents_over_500g_up_to_1000g_eur": 27.76,
    "goods_up_to_500g_eur": 21.03,
    "goods_over_500g_up_to_1000g_eur": 28.34,
    "goods_each_subsequent_kg_eur": 18.60
  },
  {
    "id": "161",
    "destination_country": "Serbia",
    "documents_up_to_500g_eur": 17.76,
    "documents_over_500g_up_to_1000g_eur": 20.21,
    "goods_up_to_500g_eur": 18.32,
    "goods_over_500g_up_to_1000g_eur": 21.34,
    "goods_each_subsequent_kg_eur": 5.29
  },
  {
    "id": "162",
    "destination_country": "Singapore",
    "documents_up_to_500g_eur": 19.26,
    "documents_over_500g_up_to_1000g_eur": 22.06,
    "goods_up_to_500g_eur": 20.43,
    "goods_over_500g_up_to_1000g_eur": 23.21,
    "goods_each_subsequent_kg_eur": 6.12
  },
  {
    "id": "163",
    "destination_country": "Syria",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "164",
    "destination_country": "Slovakia",
    "documents_up_to_500g_eur": 15.12,
    "documents_over_500g_up_to_1000g_eur": 17.22,
    "goods_up_to_500g_eur": 15.50,
    "goods_over_500g_up_to_1000g_eur": 17.82,
    "goods_each_subsequent_kg_eur": 3.12
  },
  {
    "id": "165",
    "destination_country": "Slovenia",
    "documents_up_to_500g_eur": 14.03,
    "documents_over_500g_up_to_1000g_eur": 15.12,
    "goods_up_to_500g_eur": 14.74,
    "goods_over_500g_up_to_1000g_eur": 15.81,
    "goods_each_subsequent_kg_eur": 3.03
  },
  {
    "id": "166",
    "destination_country": "Solomon Islands",
    "documents_up_to_500g_eur": 14.79,
    "documents_over_500g_up_to_1000g_eur": 20.41,
    "goods_up_to_500g_eur": 16.62,
    "goods_over_500g_up_to_1000g_eur": 23.49,
    "goods_each_subsequent_kg_eur": 12.18
  },
  {
    "id": "167",
    "destination_country": "Sudan",
    "documents_up_to_500g_eur": 23.04,
    "documents_over_500g_up_to_1000g_eur": 27.09,
    "goods_up_to_500g_eur": 23.59,
    "goods_over_500g_up_to_1000g_eur": 27.68,
    "goods_each_subsequent_kg_eur": 8.18
  },
  {
    "id": "168",
    "destination_country": "Suriname",
    "documents_up_to_500g_eur": 21.56,
    "documents_over_500g_up_to_1000g_eur": 26.46,
    "goods_up_to_500g_eur": 22.35,
    "goods_over_500g_up_to_1000g_eur": 27.35,
    "goods_each_subsequent_kg_eur": 9.37
  },
  {
    "id": "169",
    "destination_country": "United States",
    "documents_up_to_500g_eur": 48.46,
    "documents_over_500g_up_to_1000g_eur": 52.60,
    "goods_up_to_500g_eur": 49.04,
    "goods_over_500g_up_to_1000g_eur": 53.19,
    "goods_each_subsequent_kg_eur": 8.31
  },
  {
    "id": "170",
    "destination_country": "Virgin Islands, U.S.",
    "documents_up_to_500g_eur": 48.46,
    "documents_over_500g_up_to_1000g_eur": 52.60,
    "goods_up_to_500g_eur": 49.04,
    "goods_over_500g_up_to_1000g_eur": 53.18,
    "goods_each_subsequent_kg_eur": 8.31
  },
  {
    "id": "171",
    "destination_country": "Sierra Leone",
    "documents_up_to_500g_eur": 16.54,
    "documents_over_500g_up_to_1000g_eur": 20.76,
    "goods_up_to_500g_eur": 21.10,
    "goods_over_500g_up_to_1000g_eur": 25.37,
    "goods_each_subsequent_kg_eur": 8.51
  },
  {
    "id": "172",
    "destination_country": "Tajikistan",
    "documents_up_to_500g_eur": 17.66,
    "documents_over_500g_up_to_1000g_eur": 20.31,
    "goods_up_to_500g_eur": 18.22,
    "goods_over_500g_up_to_1000g_eur": 20.75,
    "goods_each_subsequent_kg_eur": 5.28
  },
  {
    "id": "173",
    "destination_country": "Thailand",
    "documents_up_to_500g_eur": 16.91,
    "documents_over_500g_up_to_1000g_eur": 19.47,
    "goods_up_to_500g_eur": 17.47,
    "goods_over_500g_up_to_1000g_eur": 19.96,
    "goods_each_subsequent_kg_eur": 5.66
  },
  {
    "id": "174",
    "destination_country": "Tanzania",
    "documents_up_to_500g_eur": 23.57,
    "documents_over_500g_up_to_1000g_eur": 27.40,
    "goods_up_to_500g_eur": 24.19,
    "goods_over_500g_up_to_1000g_eur": 28.04,
    "goods_each_subsequent_kg_eur": 7.68
  },
  {
    "id": "175",
    "destination_country": "Turks and Caicos Islands",
    "documents_up_to_500g_eur": 59.82,
    "documents_over_500g_up_to_1000g_eur": 72.84,
    "goods_up_to_500g_eur": 60.37,
    "goods_over_500g_up_to_1000g_eur": 73.26,
    "goods_each_subsequent_kg_eur": 36.69
  },
  {
    "id": "176",
    "destination_country": "Togo",
    "documents_up_to_500g_eur": 22.06,
    "documents_over_500g_up_to_1000g_eur": 26.29,
    "goods_up_to_500g_eur": 22.75,
    "goods_over_500g_up_to_1000g_eur": 26.75,
    "goods_each_subsequent_kg_eur": 8.51
  },
  {
    "id": "177",
    "destination_country": "Tonga",
    "documents_up_to_500g_eur": 18.44,
    "documents_over_500g_up_to_1000g_eur": 26.44,
    "goods_up_to_500g_eur": 21.62,
    "goods_over_500g_up_to_1000g_eur": 29.46,
    "goods_each_subsequent_kg_eur": 16.88
  },
  {
    "id": "178",
    "destination_country": "Trinidad and Tobago",
    "documents_up_to_500g_eur": 17.97,
    "documents_over_500g_up_to_1000g_eur": 23.68,
    "goods_up_to_500g_eur": 18.44,
    "goods_over_500g_up_to_1000g_eur": 24.10,
    "goods_each_subsequent_kg_eur": 11.37
  },
  {
    "id": "179",
    "destination_country": "Tunisia",
    "documents_up_to_500g_eur": 20.63,
    "documents_over_500g_up_to_1000g_eur": 24.35,
    "goods_up_to_500g_eur": 22.56,
    "goods_over_500g_up_to_1000g_eur": 26.28,
    "goods_each_subsequent_kg_eur": 7.47
  },
  {
    "id": "180",
    "destination_country": "Turkmenistan",
    "documents_up_to_500g_eur": 19.65,
    "documents_over_500g_up_to_1000g_eur": 21.63,
    "goods_up_to_500g_eur": 20.54,
    "goods_over_500g_up_to_1000g_eur": 22.57,
    "goods_each_subsequent_kg_eur": 3.03
  },
  {
    "id": "181",
    "destination_country": "Turkey",
    "documents_up_to_500g_eur": 20.85,
    "documents_over_500g_up_to_1000g_eur": 21.69,
    "goods_up_to_500g_eur": 22.15,
    "goods_over_500g_up_to_1000g_eur": 23.28,
    "goods_each_subsequent_kg_eur": 2.18
  },
  {
    "id": "182",
    "destination_country": "Uganda",
    "documents_up_to_500g_eur": 22.75,
    "documents_over_500g_up_to_1000g_eur": 26.57,
    "goods_up_to_500g_eur": 23.44,
    "goods_over_500g_up_to_1000g_eur": 27.28,
    "goods_each_subsequent_kg_eur": 8.40
  },
  {
    "id": "183",
    "destination_country": "Uzbekistan",
    "documents_up_to_500g_eur": 20.72,
    "documents_over_500g_up_to_1000g_eur": 21.91,
    "goods_up_to_500g_eur": 20.72,
    "goods_over_500g_up_to_1000g_eur": 22.63,
    "goods_each_subsequent_kg_eur": 2.76
  },
  {
    "id": "184",
    "destination_country": "Ukraine",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "185",
    "destination_country": "Uruguay",
    "documents_up_to_500g_eur": 15.74,
    "documents_over_500g_up_to_1000g_eur": 22.31,
    "goods_up_to_500g_eur": 22.18,
    "goods_over_500g_up_to_1000g_eur": 28.75,
    "goods_each_subsequent_kg_eur": 13.82
  },
  {
    "id": "186",
    "destination_country": "Fiji",
    "documents_up_to_500g_eur": 21.00,
    "documents_over_500g_up_to_1000g_eur": 30.34,
    "goods_up_to_500g_eur": 24.29,
    "goods_over_500g_up_to_1000g_eur": 32.16,
    "goods_each_subsequent_kg_eur": 16.63
  },
  {
    "id": "187",
    "destination_country": "Philippines",
    "documents_up_to_500g_eur": 18.38,
    "documents_over_500g_up_to_1000g_eur": 21.71,
    "goods_up_to_500g_eur": 18.79,
    "goods_over_500g_up_to_1000g_eur": 22.21,
    "goods_each_subsequent_kg_eur": 6.60
  },
  {
    "id": "188",
    "destination_country": "Finland",
    "documents_up_to_500g_eur": null,
    "documents_over_500g_up_to_1000g_eur": null,
    "goods_up_to_500g_eur": null,
    "goods_over_500g_up_to_1000g_eur": null,
    "goods_each_subsequent_kg_eur": null
  },
  {
    "id": "189",
    "destination_country": "France",
    "documents_up_to_500g_eur": 16.09,
    "documents_over_500g_up_to_1000g_eur": 18.01,
    "goods_up_to_500g_eur": 18.84,
    "goods_over_500g_up_to_1000g_eur": 20.28,
    "goods_each_subsequent_kg_eur": 3.88
  },
  {
    "id": "190",
    "destination_country": "French Polynesia",
    "documents_up_to_500g_eur": 51.93,
    "documents_over_500g_up_to_1000g_eur": 59.10,
    "goods_up_to_500g_eur": 52.60,
    "goods_over_500g_up_to_1000g_eur": 59.10,
    "goods_each_subsequent_kg_eur": 11.46
  },
  {
    "id": "191",
    "destination_country": "Croatia",
    "documents_up_to_500g_eur": 12.53,
    "documents_over_500g_up_to_1000g_eur": 14.72,
    "goods_up_to_500g_eur": 15.59,
    "goods_over_500g_up_to_1000g_eur": 17.03,
    "goods_each_subsequent_kg_eur": 3.43
  },
  {
    "id": "192",
    "destination_country": "Central African Republic",
    "documents_up_to_500g_eur": 20.00,
    "documents_over_500g_up_to_1000g_eur": 24.97,
    "goods_up_to_500g_eur": 20.44,
    "goods_over_500g_up_to_1000g_eur": 25.41,
    "goods_each_subsequent_kg_eur": 9.93
  },
  {
    "id": "193",
    "destination_country": "Chad",
    "documents_up_to_500g_eur": 24.74,
    "documents_over_500g_up_to_1000g_eur": 31.29,
    "goods_up_to_500g_eur": 25.35,
    "goods_over_500g_up_to_1000g_eur": 31.90,
    "goods_each_subsequent_kg_eur": 12.84
  },
  {
    "id": "194",
    "destination_country": "Montenegro",
    "documents_up_to_500g_eur": 18.71,
    "documents_over_500g_up_to_1000g_eur": 22.35,
    "goods_up_to_500g_eur": 19.15,
    "goods_over_500g_up_to_1000g_eur": 22.82,
    "goods_each_subsequent_kg_eur": 7.34
  },
  {
    "id": "195",
    "destination_country": "Czech Republic",
    "documents_up_to_500g_eur": 15.09,
    "documents_over_500g_up_to_1000g_eur": 16.54,
    "goods_up_to_500g_eur": 15.66,
    "goods_over_500g_up_to_1000g_eur": 17.00,
    "goods_each_subsequent_kg_eur": 2.72
  },
  {
    "id": "196",
    "destination_country": "Chile",
    "documents_up_to_500g_eur": 24.74,
    "documents_over_500g_up_to_1000g_eur": 31.68,
    "goods_up_to_500g_eur": 25.19,
    "goods_over_500g_up_to_1000g_eur": 32.47,
    "goods_each_subsequent_kg_eur": 14.40
  },
  {
    "id": "197",
    "destination_country": "Switzerland",
    "documents_up_to_500g_eur": 24.66,
    "documents_over_500g_up_to_1000g_eur": 25.94,
    "goods_up_to_500g_eur": 25.37,
    "goods_over_500g_up_to_1000g_eur": 26.66,
    "goods_each_subsequent_kg_eur": 3.00
  },
  {
    "id": "198",
    "destination_country": "Sweden",
    "documents_up_to_500g_eur": 27.09,
    "documents_over_500g_up_to_1000g_eur": 28.62,
    "goods_up_to_500g_eur": 27.68,
    "goods_over_500g_up_to_1000g_eur": 29.19,
    "goods_each_subsequent_kg_eur": 3.01
  },
  {
    "id": "199",
    "destination_country": "Sri Lanka",
    "documents_up_to_500g_eur": 16.35,
    "documents_over_500g_up_to_1000g_eur": 19.06,
    "goods_up_to_500g_eur": 16.81,
    "goods_over_500g_up_to_1000g_eur": 19.56,
    "goods_each_subsequent_kg_eur": 5.78
  },
  {
    "id": "200",
    "destination_country": "Ecuador",
    "documents_up_to_500g_eur": 20.68,
    "documents_over_500g_up_to_1000g_eur": 26.46,
    "goods_up_to_500g_eur": 21.43,
    "goods_over_500g_up_to_1000g_eur": 27.37,
    "goods_each_subsequent_kg_eur": 12.24
  },
  {
    "id": "201",
    "destination_country": "Equatorial Guinea",
    "documents_up_to_500g_eur": 42.66,
    "documents_over_500g_up_to_1000g_eur": 52.19,
    "goods_up_to_500g_eur": 42.66,
    "goods_over_500g_up_to_1000g_eur": 52.19,
    "goods_each_subsequent_kg_eur": 19.06
  },
  {
    "id": "202",
    "destination_country": "Eritrea",
    "documents_up_to_500g_eur": 22.34,
    "documents_over_500g_up_to_1000g_eur": 26.91,
    "goods_up_to_500g_eur": 22.81,
    "goods_over_500g_up_to_1000g_eur": 27.35,
    "goods_each_subsequent_kg_eur": 9.28
  },
  {
    "id": "203",
    "destination_country": "Estonia",
    "documents_up_to_500g_eur": 18.35,
    "documents_over_500g_up_to_1000g_eur": 19.60,
    "goods_up_to_500g_eur": 18.82,
    "goods_over_500g_up_to_1000g_eur": 20.04,
    "goods_each_subsequent_kg_eur": 2.32
  },
  {
    "id": "204",
    "destination_country": "Ethiopia",
    "documents_up_to_500g_eur": 23.99,
    "documents_over_500g_up_to_1000g_eur": 26.97,
    "goods_up_to_500g_eur": 24.71,
    "goods_over_500g_up_to_1000g_eur": 27.68,
    "goods_each_subsequent_kg_eur": 7.75
  },
  {
    "id": "205",
    "destination_country": "South Africa",
    "documents_up_to_500g_eur": 20.41,
    "documents_over_500g_up_to_1000g_eur": 26.28,
    "goods_up_to_500g_eur": 21.35,
    "goods_over_500g_up_to_1000g_eur": 27.21,
    "goods_each_subsequent_kg_eur": 11.60
  },
  {
    "id": "206",
    "destination_country": "Jamaica",
    "documents_up_to_500g_eur": 22.18,
    "documents_over_500g_up_to_1000g_eur": 27.68,
    "goods_up_to_500g_eur": 22.51,
    "goods_over_500g_up_to_1000g_eur": 28.13,
    "goods_each_subsequent_kg_eur": 11.37
  },
  {
    "id": "207",
    "destination_country": "Japan",
    "documents_up_to_500g_eur": 28.87,
    "documents_over_500g_up_to_1000g_eur": 33.51,
    "goods_up_to_500g_eur": 29.34,
    "goods_over_500g_up_to_1000g_eur": 33.97,
    "goods_each_subsequent_kg_eur": 8.35
  }
];

export interface EMSShippingCalculation {
  country: string;
  totalWeight: number; // in grams
  itemCount: number;
  type: 'goods' | 'documents';
  baseRate: number;
  additionalKgRate: number;
  totalShippingCost: number;
  customsClearanceFee: number;
  declaredValueFee: number;
  finalTotal: number;
  isAvailable: boolean;
  errorMessage?: string;
}

export interface EMSCalculatorOptions {
  itemCount: number;
  declaredValue?: number; // in EUR
  type?: 'goods' | 'documents';
}

const ITEM_WEIGHT_GRAMS = 400; // Each product weighs approximately 400 grams
const CUSTOMS_CLEARANCE_FEE_EUR = 2.41;
const DECLARED_VALUE_FEE_PERCENTAGE = 0.03; // 3.0%

/**
 * Get all available EMS shipping countries
 */
export const getAvailableEMSCountries = (): string[] => {
  return emsShippingRates
    .filter((rate: EMSShippingRate) => rate.goods_up_to_500g_eur !== null)
    .map((rate: EMSShippingRate) => rate.destination_country)
    .sort();
};

/**
 * Get all countries (including unavailable ones for reference)
 */
export const getAllCountries = (): { available: string[]; unavailable: string[] } => {
  const available: string[] = [];
  const unavailable: string[] = [];
  
  emsShippingRates.forEach((rate) => {
    if (rate.goods_up_to_500g_eur !== null) {
      available.push(rate.destination_country);
    } else {
      unavailable.push(rate.destination_country);
    }
  });
  
  return {
    available: available.sort(),
    unavailable: unavailable.sort()
  };
};

/**
 * Check if EMS is available for a specific country
 */
export const isEMSAvailable = (country: string): boolean => {
  const rate = findEMSRateByCountry(country);
  return rate !== null && rate.goods_up_to_500g_eur !== null;
};

/**
 * Get EMS coverage statistics
 */
export const getEMSCoverageStats = () => {
  const totalCountries = emsShippingRates.length;
  const availableCountries = emsShippingRates.filter(rate => rate.goods_up_to_500g_eur !== null).length;
  const unavailableCountries = totalCountries - availableCountries;
  
  return {
    total: totalCountries,
    available: availableCountries,
    unavailable: unavailableCountries,
    coveragePercentage: Math.round((availableCountries / totalCountries) * 100 * 100) / 100
  };
};

/**
 * Find EMS rate for a specific country
 */
export const findEMSRateByCountry = (country: string): EMSShippingRate | null => {
  const rate = emsShippingRates.find(
    (rate: EMSShippingRate) => rate.destination_country.toLowerCase() === country.toLowerCase()
  );
  
  return rate || null;
};

/**
 * Calculate weight-based shipping cost
 */
const calculateWeightBasedCost = (
  rate: EMSShippingRate,
  totalWeightGrams: number,
  type: 'goods' | 'documents'
): { baseRate: number; additionalKgRate: number; totalCost: number } => {
  const totalWeightKg = totalWeightGrams / 1000;
  
  let baseRate = 0;
  let additionalKgRate = 0;
  
  // Get the appropriate rates based on type
  const upTo500g = type === 'goods' ? rate.goods_up_to_500g_eur : rate.documents_up_to_500g_eur;
  const upTo1000g = type === 'goods' ? rate.goods_over_500g_up_to_1000g_eur : rate.documents_over_500g_up_to_1000g_eur;
  const perKg = type === 'goods' ? rate.goods_each_subsequent_kg_eur : rate.goods_each_subsequent_kg_eur;
  
  if (!upTo500g || !upTo1000g || !perKg) {
    throw new Error('Invalid rate data');
  }
  
  // Calculate base cost
  if (totalWeightGrams <= 500) {
    baseRate = upTo500g;
  } else if (totalWeightGrams <= 1000) {
    baseRate = upTo1000g;
  } else {
    baseRate = upTo1000g;
    const additionalKg = Math.ceil(totalWeightKg - 1);
    additionalKgRate = additionalKg * perKg;
  }
  
  return {
    baseRate,
    additionalKgRate,
    totalCost: baseRate + additionalKgRate
  };
};

/**
 * Calculate EMS shipping cost for a given country and options
 */
export const calculateEMSShipping = (
  country: string,
  options: EMSCalculatorOptions
): EMSShippingCalculation => {
  const { itemCount, declaredValue = 0, type = 'goods' } = options;
  
  // Find the rate for the country
  const rate = findEMSRateByCountry(country);
  
  if (!rate) {
    return {
      country,
      totalWeight: itemCount * ITEM_WEIGHT_GRAMS,
      itemCount,
      type,
      baseRate: 0,
      additionalKgRate: 0,
      totalShippingCost: 0,
      customsClearanceFee: 0,
      declaredValueFee: 0,
      finalTotal: 0,
      isAvailable: false,
      errorMessage: 'Country not found in EMS shipping rates'
    };
  }
  
  // Check if rates are available for this country
  const upTo500g = type === 'goods' ? rate.goods_up_to_500g_eur : rate.documents_up_to_500g_eur;
  if (!upTo500g) {
    return {
      country,
      totalWeight: itemCount * ITEM_WEIGHT_GRAMS,
      itemCount,
      type,
      baseRate: 0,
      additionalKgRate: 0,
      totalShippingCost: 0,
      customsClearanceFee: 0,
      declaredValueFee: 0,
      finalTotal: 0,
      isAvailable: false,
      errorMessage: 'EMS shipping not available for this country'
    };
  }
  
  // Calculate total weight
  const totalWeight = itemCount * ITEM_WEIGHT_GRAMS;
  
  try {
    // Calculate weight-based shipping cost
    const { baseRate, additionalKgRate, totalCost } = calculateWeightBasedCost(rate, totalWeight, type);
    
    // Calculate additional fees
    const customsClearanceFee = CUSTOMS_CLEARANCE_FEE_EUR;
    const declaredValueFee = declaredValue * DECLARED_VALUE_FEE_PERCENTAGE;
    
    // Calculate final total
    const finalTotal = totalCost + customsClearanceFee + declaredValueFee;
    
    return {
      country,
      totalWeight,
      itemCount,
      type,
      baseRate,
      additionalKgRate,
      totalShippingCost: totalCost,
      customsClearanceFee,
      declaredValueFee,
      finalTotal,
      isAvailable: true
    };
  } catch (error) {
    return {
      country,
      totalWeight,
      itemCount,
      type,
      baseRate: 0,
      additionalKgRate: 0,
      totalShippingCost: 0,
      customsClearanceFee: 0,
      declaredValueFee: 0,
      finalTotal: 0,
      isAvailable: false,
      errorMessage: error instanceof Error ? error.message : 'Calculation error'
    };
  }
};

/**
 * Get EMS shipping rate for checkout integration
 */
export const getEMSShippingMethod = (
  country: string,
  itemCount: number,
  declaredValue?: number,
  customDescription?: string,
  customName?: string
) => {
  const calculation = calculateEMSShipping(country, { itemCount, declaredValue });
  
  if (!calculation.isAvailable) {
    return null;
  }
  
  const defaultDescription = `Fast and reliable international shipping to ${country}. Weight: ${(calculation.totalWeight / 1000).toFixed(2)}kg`;
  const defaultName = 'EMS International Express Mail Service';
  
  return {
    id: 999, // Special ID for EMS
    name: customName || defaultName,
    description: customDescription || defaultDescription,
    cost: calculation.finalTotal,
    estimated_delivery_min_days: 5,
    estimated_delivery_max_days: 10,
    is_active: true
  };
};

/**
 * Format weight display
 */
export const formatWeight = (weightGrams: number): string => {
  if (weightGrams < 1000) {
    return `${weightGrams}g`;
  }
  return `${(weightGrams / 1000).toFixed(2)}kg`;
};

/**
 * Format EMS calculation summary
 */
export const formatEMSCalculationSummary = (calculation: EMSShippingCalculation): string => {
  if (!calculation.isAvailable) {
    return calculation.errorMessage || 'Not available';
  }
  
  return [
    `Base rate: ${calculation.baseRate.toFixed(2)} EUR`,
    calculation.additionalKgRate > 0 ? `Additional weight: ${calculation.additionalKgRate.toFixed(2)} EUR` : '',
    `Customs clearance: ${calculation.customsClearanceFee.toFixed(2)} EUR`,
    calculation.declaredValueFee > 0 ? `Declared value fee: ${calculation.declaredValueFee.toFixed(2)} EUR` : '',
    `Total: ${calculation.finalTotal.toFixed(2)} EUR`
  ].filter(Boolean).join(' | ');
};
