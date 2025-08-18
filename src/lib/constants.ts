// Industry options for technician specialization
export const INDUSTRY_OPTIONS = [
  'Manufacturing',
  'Construction',
  'Healthcare',
  'Transportation',
  'Energy',
  'Technology',
  'Agriculture',
  'Mining',
  'Chemical',
  'Food & Beverage',
  'Pharmaceuticals',
  'Automotive',
  'Aerospace',
  'Maritime',
  'Telecommunications',
  'Utilities',
  'Waste Management',
  'Textiles',
  'Paper & Pulp',
  'Other'
] as const;

export type Industry = typeof INDUSTRY_OPTIONS[number];

// Specialization options by industry (for future use)
export const SPECIALIZATION_OPTIONS: Record<Industry, string[]> = {
  'Manufacturing': ['CNC', 'Welding', 'Electronics', 'Mechanical', 'Quality Control'],
  'Construction': ['Electrical', 'Plumbing', 'HVAC', 'Structural', 'Safety'],
  'Healthcare': ['Medical Equipment', 'Biomedical', 'Laboratory', 'Pharmacy', 'Radiology'],
  'Transportation': ['Automotive', 'Aviation', 'Marine', 'Railway', 'Fleet Management'],
  'Energy': ['Solar', 'Wind', 'Nuclear', 'Oil & Gas', 'Hydroelectric'],
  'Technology': ['IT Infrastructure', 'Networking', 'Software', 'Hardware', 'Cybersecurity'],
  'Agriculture': ['Irrigation', 'Machinery', 'Greenhouse', 'Livestock', 'Crop Management'],
  'Mining': ['Heavy Equipment', 'Safety Systems', 'Processing', 'Exploration', 'Environmental'],
  'Chemical': ['Process Control', 'Safety Systems', 'Analytical', 'Environmental', 'Quality'],
  'Food & Beverage': ['Processing Equipment', 'Packaging', 'Quality Control', 'Safety', 'Sanitation'],
  'Pharmaceuticals': ['Laboratory Equipment', 'Clean Room', 'Validation', 'Quality Control', 'Safety'],
  'Automotive': ['Engine', 'Transmission', 'Electrical', 'Body Work', 'Diagnostics'],
  'Aerospace': ['Avionics', 'Engines', 'Structures', 'Quality Control', 'Safety'],
  'Maritime': ['Navigation', 'Engines', 'Safety Systems', 'Cargo Handling', 'Communication'],
  'Telecommunications': ['Network Equipment', 'Fiber Optics', 'Wireless', 'Satellite', 'Security'],
  'Utilities': ['Power Generation', 'Distribution', 'Water Treatment', 'Waste Management', 'Metering'],
  'Waste Management': ['Collection Systems', 'Processing', 'Environmental', 'Safety', 'Recycling'],
  'Textiles': ['Weaving', 'Dyeing', 'Finishing', 'Quality Control', 'Safety'],
  'Paper & Pulp': ['Processing', 'Environmental', 'Quality Control', 'Safety', 'Maintenance'],
  'Other': ['General Maintenance', 'Safety', 'Quality Control', 'Environmental', 'Technical Support']
};
