export const VEG_TELUGU_NAMES: Record<string, string> = {
  'Tomato': 'టమోటా',
  'Onion': 'ఉల్లిపాయ',
  'Potato': 'బంగాళాదుంప',
  'Green Chilli': 'పచ్చిమిర్చి',
  'Brinjal': 'వంకాయ',
  'Okra': 'బెండకాయ',
  'Cabbage': 'క్యాబేజీ',
  'Cauliflower': 'కాలీఫ్లవర్',
  'Spinach': 'పాలకూర',
  'Bottle Gourd': 'సొరకాయ',
  'Capsicum': 'క్యాప్సికం',
  'Cucumber': 'దోసకాయ',
  'Peas': 'బఠానీలు',
  'Beans': 'బీన్స్',
  'Radish': 'ముల్లంగి',
  'Ginger': 'అల్లం',
};

export const getVegTelugu = (name: string): string => {
  if (!name) return '';
  const key = Object.keys(VEG_TELUGU_NAMES).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? VEG_TELUGU_NAMES[key] : '';
};
