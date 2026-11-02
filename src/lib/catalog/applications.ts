export const VEHICLE_APPLICATIONS = [
  { slug: "passenger-cars", name: "Passenger cars & SUVs" },
  { slug: "petrol-engines", name: "Petrol engines" },
  { slug: "diesel-engines", name: "Diesel engines" },
  { slug: "heavy-duty-diesel-fleets", name: "Heavy-duty diesel & fleets" },
  { slug: "two-stroke-motorcycles", name: "Two-stroke motorcycles" },
  { slug: "four-stroke-motorcycles", name: "Four-stroke motorcycles" },
  { slug: "marine-outboard-engines", name: "Marine & outboard engines" },
  { slug: "automatic-transmissions-power-steering", name: "Automatic transmissions & power steering" },
  { slug: "powershift-transmissions", name: "Powershift transmissions" },
  { slug: "manual-gearboxes-differentials", name: "Manual gearboxes & differentials" },
  { slug: "tractors-agricultural-machinery", name: "Tractors & agricultural machinery" },
  { slug: "brakes-clutches", name: "Brakes & clutches" },
  { slug: "cooling-systems", name: "Cooling systems" },
  { slug: "suspension-shock-absorbers", name: "Suspension & shock absorbers" },
  { slug: "hydraulic-equipment", name: "Hydraulic equipment" },
  { slug: "industrial-gear-systems", name: "Industrial gear systems" },
  { slug: "turbines", name: "Turbines" },
  { slug: "compressors", name: "Compressors" },
  { slug: "metalworking", name: "Metalworking" },
  { slug: "circulation-systems", name: "Circulation systems" },
  { slug: "machine-slideways", name: "Machine slideways" },
  { slug: "pneumatic-tools", name: "Pneumatic tools" },
  { slug: "grease-applications", name: "Automotive & industrial grease" },
  { slug: "heat-transfer-systems", name: "Heat-transfer systems" },
  { slug: "open-gears", name: "Open gears" },
  { slug: "vehicle-filters", name: "Vehicle filters" },
  { slug: "engine-fuel-treatment", name: "Engine & fuel treatment" },
  { slug: "vehicle-care", name: "Vehicle care" },
  { slug: "battery-maintenance", name: "Battery maintenance" },
  { slug: "workshop-vehicle-accessories", name: "Workshop & vehicle accessories" },
  { slug: "general-workshop-lubrication", name: "General workshop lubrication" },
] as const;

export type VehicleApplicationSlug = (typeof VEHICLE_APPLICATIONS)[number]["slug"];

export const VEHICLE_APPLICATION_SLUGS = VEHICLE_APPLICATIONS.map((item) => item.slug) as [
  VehicleApplicationSlug,
  ...VehicleApplicationSlug[],
];

const applicationNames = new Map<string, string>(VEHICLE_APPLICATIONS.map((item) => [item.slug, item.name]));

export function vehicleApplicationName(slug: string) {
  return applicationNames.get(slug) ?? slug.replaceAll("-", " ");
}

export function applicationsForInventoryProduct(item: { category: string; name: string }) {
  const value = item.name.toLowerCase();
  const applications: VehicleApplicationSlug[] = [];
  const add = (...items: VehicleApplicationSlug[]) => applications.push(...items);

  switch (item.category) {
    case "engine-oils": add("passenger-cars", "petrol-engines"); break;
    case "diesel-engine-oils": add("diesel-engines", "heavy-duty-diesel-fleets"); break;
    case "motorcycle-oils":
      if (/\b2t\b|two.stroke/.test(value)) add("two-stroke-motorcycles");
      else if (/outboard|tcw/.test(value)) add("marine-outboard-engines");
      else add("four-stroke-motorcycles");
      break;
    case "transmission-fluids": add("automatic-transmissions-power-steering"); break;
    case "gear-oils": add("manual-gearboxes-differentials"); break;
    case "suspension-fluids": add("suspension-shock-absorbers"); break;
    case "coolants": add("cooling-systems"); break;
    case "brake-fluids": add("brakes-clutches"); break;
    case "filters": add("vehicle-filters"); break;
    case "additives-cleaners": add("engine-fuel-treatment"); break;
    case "car-care": add("vehicle-care"); break;
    case "battery-care": add("battery-maintenance"); break;
    case "automotive-accessories": add("workshop-vehicle-accessories"); break;
    case "greases-lubricants":
      if (/rando|hydraulic/.test(value)) add("hydraulic-equipment");
      else if (/compressor/.test(value)) add("compressors");
      else add("grease-applications");
      break;
    case "loose-oils":
      if (/compressor|comp oil/.test(value)) add("compressors");
      else if (/rando|hydraulic/.test(value)) add("hydraulic-equipment");
      else if (/gear|mtf/.test(value)) add("manual-gearboxes-differentials");
      else if (/2t/.test(value)) add("two-stroke-motorcycles");
      else if (/4t/.test(value)) add("four-stroke-motorcycles");
      else if (/delo|diesel|super ds|delvac|all fleet|\bd40\b|power d/.test(value)) add("diesel-engines", "heavy-duty-diesel-fleets");
      else if (/atf|texamatic|cvt/.test(value)) add("automatic-transmissions-power-steering");
      else add("general-workshop-lubrication");
      break;
  }

  return [...new Set(applications)];
}
