export type ImageAsset = {
  url: string
  filePage?: string
  caption: string
  attribution: string
  license: string
  date?: string
}

export const HERO_IMAGE: ImageAsset = {
  url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Nagpur_metro_rail.jpg/960px-Nagpur_metro_rail.jpg',
  filePage: 'https://commons.wikimedia.org/wiki/File:Nagpur_metro_rail.jpg',
  caption: 'Operational Nagpur Metro — urban infrastructure, Nagpur.',
  attribution: 'Azhar2311',
  license: 'CC BY-SA 4.0',
  date: '2022-10-25',
}

export const PHOTO_STRIP: ImageAsset[] = [
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Ring_Road_at_Uday_Nagar_Nagpur.jpg/960px-Ring_Road_at_Uday_Nagar_Nagpur.jpg',
    filePage: 'https://commons.wikimedia.org/wiki/File:Ring_Road_at_Uday_Nagar_Nagpur.jpg',
    caption: 'Ring Road at Uday Nagar, Nagpur.',
    attribution: 'Ganesh Dhamodkar',
    license: 'CC BY-SA 4.0',
    date: '2023-09-19',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Automotive_to_Kanhan_Metro-Line_work.jpg/960px-Automotive_to_Kanhan_Metro-Line_work.jpg',
    filePage: 'https://commons.wikimedia.org/wiki/File:Automotive_to_Kanhan_Metro-Line_work.jpg',
    caption: 'Metro Phase-II line construction, Nagpur.',
    attribution: 'Kmohankar',
    license: 'CC BY 4.0',
    date: '2024-05-11',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Nagpur_metro_viaduct1.jpeg/960px-Nagpur_metro_viaduct1.jpeg',
    filePage: 'https://commons.wikimedia.org/wiki/File:Nagpur_metro_viaduct1.jpeg',
    caption: 'Elevated metro viaduct under construction, Nagpur.',
    attribution: 'bk kartik21',
    license: 'CC BY-SA 4.0',
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Nagpur_metro_rail.jpg/960px-Nagpur_metro_rail.jpg',
    filePage: 'https://commons.wikimedia.org/wiki/File:Nagpur_metro_rail.jpg',
    caption: 'Operational Nagpur Metro train.',
    attribution: 'Azhar2311',
    license: 'CC BY-SA 4.0',
    date: '2022-10-25',
  },
]

export type FeaturedCard = {
  id: string
  name: string
  category: string
  categoryShort: string
  budget: string
  progress: number
  status: 'In Progress' | 'Completed' | 'Delayed'
  description: string
  color: string
  image: ImageAsset
  href: string
}

export const FEATURED_CARDS: FeaturedCard[] = [
  {
    id: 'NRD-204',
    name: 'Ward 24 Road Development',
    category: 'Roads',
    categoryShort: 'R',
    budget: '\u20B950 Cr',
    progress: 82,
    status: 'In Progress',
    description: 'Arterial road redevelopment with sub-base, asphalt surfacing, drainage and street lighting.',
    color: '#1d5cc7',
    image: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Ring_Road_at_Uday_Nagar_Nagpur.jpg/960px-Ring_Road_at_Uday_Nagar_Nagpur.jpg',
      filePage: 'https://commons.wikimedia.org/wiki/File:Ring_Road_at_Uday_Nagar_Nagpur.jpg',
      caption: 'Ring Road at Uday Nagar, Nagpur — road infrastructure.',
      attribution: 'Ganesh Dhamodkar',
      license: 'CC BY-SA 4.0',
      date: '2023-09-19',
    },
    href: '/projects/NRD-204',
  },
  {
    id: 'SCH-091',
    name: 'Government High School',
    category: 'Schools',
    categoryShort: 'S',
    budget: '\u20B915 Cr',
    progress: 67,
    status: 'Completed',
    description: 'Government school building with classrooms, laboratory block and student amenities.',
    color: '#179c5d',
    image: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Government_School_in_New_Delhi.jpg/960px-Government_School_in_New_Delhi.jpg',
      filePage: 'https://commons.wikimedia.org/wiki/File:Government_School_in_New_Delhi.jpg',
      caption: 'Government school building in New Delhi, India.',
      attribution: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
    },
    href: '/projects?category=Schools',
  },
  {
    id: 'WTP-312',
    name: 'Water Treatment Plant',
    category: 'Water Plants',
    categoryShort: 'W',
    budget: '\u20B9120 Cr',
    progress: 56,
    status: 'In Progress',
    description: 'Water treatment plant upgrade adding filtration and sedimentation capacity.',
    color: '#0891b2',
    image: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Findlay%2C_Ohio_Water_Treatment_Plant.jpg/960px-Findlay%2C_Ohio_Water_Treatment_Plant.jpg',
      filePage: 'https://commons.wikimedia.org/wiki/File:Findlay,_Ohio_Water_Treatment_Plant.jpg',
      caption: 'Water treatment plant infrastructure.',
      attribution: 'Wikimedia Commons',
      license: 'CC BY 4.0',
    },
    href: '/projects?category=Water%20Plants',
  },
  {
    id: 'HSP-076',
    name: 'City Hospital Expansion',
    category: 'Hospitals',
    categoryShort: 'H',
    budget: '\u20B9200 Cr',
    progress: 48,
    status: 'Delayed',
    description: 'Expansion of a city public hospital with new wards, ICU and emergency wing.',
    color: '#e11d48',
    image: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Nagpur_Government_Medical_College_and_Hospital.jpg/960px-Nagpur_Government_Medical_College_and_Hospital.jpg',
      filePage: 'https://commons.wikimedia.org/wiki/File:Nagpur_Government_Medical_College_and_Hospital.jpg',
      caption: 'Nagpur Government Medical College and Hospital (Mayo Hospital).',
      attribution: 'Amitbalani',
      license: 'CC0 1.0',
      date: '2025-06',
    },
    href: '/projects?category=Hospitals',
  },
]

export const OVERVIEW = {
  badge: 'Nagpur',
  heading: 'See where public money is going.',
  subtitle: 'Explore projects, spending and development progress — backed by evidence.',
  searchPlaceholder: 'Search your city, district or project...',
  stats: [
    { value: '127', label: 'Projects' },
    { value: '\u20B92,840 Cr', label: 'Public Funds' },
    { value: '83%', label: 'Evidence Verified' },
  ],
}

export const QUICK_INSIGHTS = [
  { label: 'Total Projects in Nagpur', value: '127' },
  { label: 'Completed Projects', value: '78 (61%)' },
  { label: 'Average Delay', value: '4.2 months' },
  { label: 'Evidence Completeness', value: '83%' },
]

export const CATEGORY_COUNTS = [
  { label: 'Roads', count: 42, color: '#1d5cc7' },
  { label: 'Bridges', count: 8, color: '#0ea5e9' },
  { label: 'Schools', count: 21, color: '#179c5d' },
  { label: 'Hospitals', count: 12, color: '#e11d48' },
  { label: 'Water Plants', count: 7, color: '#0891b2' },
  { label: 'Water Supply', count: 18, color: '#2563eb' },
  { label: 'Public Buildings', count: 14, color: '#7c3aed' },
]

export const SIDE_TICKERS = {
  compare: {
    title: 'Compare Governments',
    city: 'Nagpur',
    scope: 'Roads & Infrastructure',
    range: '2015\u20132025',
  },
  contractor: {
    title: 'Contractor Intelligence',
    fallbackName: 'Shree Infrastructure Pvt. Ltd.',
    subtitle: 'Public Project History',
  },
}