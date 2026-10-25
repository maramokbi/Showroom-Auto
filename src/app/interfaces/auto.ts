export interface Specs {
  body?: string;
  energy?: string;
  hp?: string;
  gearbox?: string;
  acceleration?: string;
  consumption?: string;
  trunk?: string;
}

export interface Auto {
  id: number;
  brand: string;
  model: string;
  year?: number;
  price: number;
  power?: number;
  photo?: string;
  availability?: number;
  description?: string;
  url?: string;
  scrapedAt?: string;
  specs?: Specs;
}