import { PHARMA_DATA } from './pharmaData.js';
import { CHEMENG_DATA } from './chemengData.js';
import { useState, useEffect, useCallback, useRef } from "react";
import { sendOTP, verifyOTP, getProfile, upsertProfile, incrementUsage, setSession, getSession } from "./supabase.js";

const INR_TO_USD = 1 / 83.5;
const THEME_BLUE = "#4f9cf9";
const fmtCur = (inr, cur) => {
  if (cur === "INR") return `₹${Number(inr).toFixed(2)}`;
  return `$${(Number(inr) * INR_TO_USD).toFixed(3)}`;
};

// Each ingredient has: p = percentage by weight, c = cost per kg in INR
// Formula cost/kg = SUM of (p/100 * c) for all ingredients
// This is always correct regardless of whether percentages add to 100 or not
const calcCostPerKg = (ingredients, customPrices = {}) => {
  return ingredients.reduce((total, ing) => {
    const pricePer_kg = Number(customPrices[ing.n] ?? ing.c);
    const fraction = Number(ing.p) / 100;
    return total + fraction * pricePer_kg;
  }, 0);
};

const PLANS = {
  free:   { name:"Free",   inr:0,    color:"#64748b", ai:1,   hasFormulas:false },
  annual: { name:"Annual", inr:3999, color:"#4f9cf9", ai:30,  hasFormulas:true  },
};

const RZP = {
  annual:    "https://rzp.io/rzp/OsfvTlgL",  // ₹3,999/year
  formula49: "https://rzp.io/rzp/UGVHhQ7D",  // ₹49 single formula
  ai99:      "https://rzp.io/rzp/ha2yZxJa",  // ₹99 single AI
  ai799:     "https://rzp.io/rzp/To6yOYE",   // ₹799 10 AI credits
  process999:"https://rzp.io/rzp/WtmY3Ca0",  // ₹999 process+equipment
  custom999: "https://rzp.io/rzp/6afbjT1F",  // ₹999 custom formulation
};

const INDUSTRIES = [
  { id:"construction", label:"Construction Chemicals", icon:"🏗️" },
  { id:"paints",       label:"Paints & Coatings",      icon:"🎨" },
  { id:"adhesives",    label:"Adhesives & Sealants",    icon:"🔗" },
  { id:"cosmetics",    label:"Cosmetics & Personal Care",icon:"✨" },
  { id:"homecare",     label:"Homecare & Cleaning",     icon:"🧹" },
  { id:"chemical",     label:"Chemical Manufacturing",  icon:"⚗️" },
  { id:"pharma",       label:"Pharma / Nutraceuticals", icon:"💊" },
  { id:"other",        label:"Other / Research",        icon:"🔬" },
];

const INDUSTRY_PRIORITY = {
  construction:["drymix","coatings","adhesives"],
  paints:      ["paints","coatings","adhesives"],
  adhesives:   ["adhesives","coatings","drymix"],
  cosmetics:   ["cosmetics","homecare"],
  homecare:    ["homecare","cosmetics"],
  chemical:    ["chemeng"],
  pharma:      ["cosmetics","homecare","chemeng"],
  other:       [],
};

const CATEGORIES = [
  { id:"drymix",    label:"Drymix",     icon:"🏗️", color:"#e8a838" },
  { id:"paints",    label:"Paints",     icon:"🎨", color:"#4f9cf9" },
  { id:"coatings",  label:"Coatings",   icon:"🛡️", color:"#34d399" },
  { id:"adhesives", label:"Adhesives",  icon:"🔗", color:"#fb7185" },
  { id:"cosmetics", label:"Cosmetics",  icon:"✨", color:"#f472b6" },
  { id:"homecare",  label:"Homecare",   icon:"🧹", color:"#a78bfa" },
  { id:"inks",      label:"Inks",        icon:"🖨️", color:"#06b6d4" },
  { id:"sizing",    label:"Sizing Agents",icon:"🧵", color:"#84cc16" },
  { id:"agro",       label:"Agrochemicals",icon:"🌱", color:"#86efac" },
  { id:"fragrance",  label:"Fragrances",   icon:"🌸", color:"#f9a8d4" },
  { id:"nutra",      label:"Nutraceuticals",icon:"💪", color:"#34d399" },
  { id:"chemeng",    label:"ChemEng Pro",   icon:"⚗️", color:"#fb923c", paid:true },
  { id:"pharma",     label:"Pharma API",    icon:"💊", color:"#e879f9", paid:true },
  { id:"request",    label:"+ Request", icon:"📩", color:"#f59e0b", special:true },
];

// Cost calculation verification example:
// White Wall Putty:
//   White Cement 22% @ ₹12/kg  → 0.22 × 12 = ₹2.64
//   Dolomite 60% @ ₹3/kg       → 0.60 ×  3 = ₹1.80
//   Marble Powder 12% @ ₹4/kg  → 0.12 ×  4 = ₹0.48
//   HPMC 0.3% @ ₹350/kg        → 0.003×350 = ₹1.05
//   Hydrated Lime 5% @ ₹4/kg   → 0.05 ×  4 = ₹0.20
//   TOTAL = ₹6.17/kg ✓ (market ~₹12-14/kg after overheads, packaging, margin)

const FORMULAS = {
  drymix:[
    { id:"dm1", name:"Tile Adhesive C1 (IS:15477)", sub:"Standard cement-based, per XLS", score:82, tags:["C1","IS:15477"], free:true,
      ingredients:[
        {n:"OPC 53 grey cement",  p:40,   c:5.5},
        {n:"Sand 30/80 mesh",     p:35,   c:1.8},
        {n:"Sand 50/120 mesh",    p:20,   c:1.8},
        {n:"Coal Flyash",         p:5,    c:1.2},
        {n:"RDP",                 p:1,    c:160},
        {n:"MHEC",                p:0.30, c:275},
        {n:"Calcium Formate",     p:0.50, c:75},
        {n:"Silica Fume",         p:0.50, c:30},
      ],
      process:"Cement-based adhesive produced by dry blending of all mineral and polymer components. Cement and sand fractions form the structural matrix while flyash fills voids and aids workability. MHEC provides water retention and open time; RDP adds flexibility and wet adhesion. Blending sequence, sieve size and moisture-proof packaging are the critical process parameters. Contact us for the Process Flow Diagram and detailed SOP.",
      equipment:["Ribbon blender 500–1000 L","1.5 mm vibratory sieve","Auto bagging machine 25 kg","Moisture analyser","Bag filter"] },
    { id:"dm2", name:"Tile Adhesive C2TE (IS:15477)", sub:"Improved, extended open time, non-sag", score:91, tags:["C2TE","IS:15477"], free:true,
      ingredients:[
        {n:"OPC 53 grey cement",  p:35,   c:5.5},
        {n:"Sand 30/80 mesh",     p:40,   c:1.8},
        {n:"Sand 50/120 mesh",    p:20,   c:1.8},
        {n:"Coal Flyash",         p:5,    c:1.2},
        {n:"RDP",                 p:3,    c:160},
        {n:"MHEC",                p:0.40, c:275},
        {n:"Calcium Formate",     p:0.80, c:75},
        {n:"Silica Fume",         p:3,    c:30},
      ],
      process:"C2TE grade requires higher RDP and MHEC dosage compared to C1 to achieve extended open time and non-sag T classification. Silica fume at 3% significantly improves tensile bond strength. The blending process is similar but batch homogeneity is more critical. Contact us for Process Flow Diagram and QC protocols.",
      equipment:["Ribbon blender 1000 L","Slip tester EN1308","Open time jig","Tensile bond tester"] },
    { id:"dm3", name:"White Wall Putty (IS:6278)", sub:"Interior, high whiteness, smooth finish", score:84, tags:["putty","interior","IS:6278"], free:true,
      ingredients:[
        {n:"White Cement OPC 53", p:22,   c:18.5},
        {n:"Dolomite 325 mesh",   p:70,   c:3},
        {n:"Hydrated Lime",       p:8,    c:12},
        {n:"RDP",                 p:0.50, c:160},
        {n:"MHEC",                p:0.30, c:275},
      ],
      process:"White putty is a dry blend of white cement, dolomite and hydrated lime as the bulk matrix. RDP improves flexibility and reduces micro-cracking. MHEC provides workability and water retention. Sieving through 150 micron is critical for smooth finish. Contact us for Process Flow Diagram.",
      equipment:["Ribbon blender 500 L","150 µm vibratory sieve","Whiteness meter","Bond strength tester"] },
    { id:"dm4", name:"AAC Block Jointing Mortar", sub:"Thin-bed, 2–3 mm joint", score:85, tags:["AAC","thin-bed"], free:true,
      ingredients:[
        {n:"OPC 53 grey cement",  p:32,   c:5.5},
        {n:"Sand 30/80 mesh",     p:30,   c:1.8},
        {n:"Sand 50/120 mesh",    p:30,   c:1.8},
        {n:"Coal Flyash",         p:8,    c:1.2},
        {n:"RDP",                 p:0.60, c:160},
        {n:"MHEC",                p:0.30, c:275},
        {n:"Calcium Formate",     p:0.50, c:75},
        {n:"Silica Fume",         p:0.50, c:30},
      ],
      process:"Thin-bed jointing mortar for AAC blocks requires very fine sand grading for application at 2–3 mm joint thickness. Higher paste content and MHEC water retention ensure adequate bond without water absorption by the porous AAC block. Contact us for Process Flow Diagram.",
      equipment:["Ribbon blender","Flow table","Tensile bond test rig","Water retention apparatus"] },
    { id:"dm5", name:"Ready Mix Plaster", sub:"Machine/hand applied, CS2 grade", score:80, tags:["plaster","EN998-1"],
      ingredients:[
        {n:"OPC 53 grey cement",  p:20,   c:5.5},
        {n:"Sand upto 2mm",       p:72,   c:1.8},
        {n:"Flyash",              p:8,    c:1.2},
        {n:"RDP",                 p:0.30, c:160},
        {n:"MHEC",                p:0.20, c:275},
        {n:"PP Fiber 3mm",        p:0.05, c:75},
        {n:"Air Entrainer",       p:0.005,c:120},
      ],
      process:"Ready-mix plaster combines cement, coarse sand and flyash. PP fibres improve crack resistance and air entrainer aids workability in machine application. Low MHEC dosage provides water retention. Contact us for Process Flow Diagram and machine application SOP.",
      equipment:["Drum mixer","Compressive strength press","Spray plaster machine"] },
    { id:"dm6", name:"Cementitious Grout — White", sub:"CG2 grade, EN13888", score:89, tags:["grout","CG2","white"],
      ingredients:[
        {n:"White Cement OPC 53", p:40,   c:18.5},
        {n:"Dolomite 325 mesh",   p:60,   c:3},
        {n:"RDP",                 p:0.80, c:160},
        {n:"MHEC",                p:0.30, c:275},
      ],
      process:"White cementitious grout using white cement and dolomite. Dolomite fineness is critical for smooth joint. RDP improves flexibility; MHEC ensures water retention. Contact us for detailed process.",
      equipment:["Ribbon blender","Spectrophotometer","Shrinkage bar molds"] },
    { id:"dm7", name:"Cementitious Grout — Jet Black", sub:"CG2, black oxide pigmented", score:88, tags:["grout","black"],
      ingredients:[
        {n:"White Cement OPC 53", p:40,   c:18.5},
        {n:"Dolomite 325 mesh",   p:50,   c:3},
        {n:"Black Iron Oxide",    p:10,   c:180},
        {n:"RDP",                 p:0.80, c:160},
        {n:"MHEC",                p:0.30, c:275},
      ],
      process:"High oxide loading for deep black. Oxide pre-blended with dolomite before cement addition to avoid streaking. Contact us for process flow.",
      equipment:["Ribbon blender","Spectrophotometer"] },
    { id:"dm8", name:"Cementitious Grout — Steel Grey", sub:"CG2, neutral grey", score:87, tags:["grout","grey"],
      ingredients:[
        {n:"White Cement OPC 53", p:40,   c:18.5},
        {n:"Dolomite 325 mesh",   p:59,   c:3},
        {n:"Black Iron Oxide",    p:0.50, c:180},
        {n:"RDP",                 p:0.80, c:160},
        {n:"MHEC",                p:0.30, c:275},
      ],
      process:"Low black oxide loading for neutral steel grey. Precise weighing critical for shade consistency. Contact us for process flow.",
      equipment:["Ribbon blender","Spectrophotometer"] },
    { id:"dm9", name:"Cementitious Grout — Ivory", sub:"CG2, warm ivory tone", score:87, tags:["grout","ivory"],
      ingredients:[
        {n:"White Cement OPC 53", p:40,   c:18.5},
        {n:"Dolomite 325 mesh",   p:59,   c:3},
        {n:"Yellow Iron Oxide",   p:1,    c:180},
        {n:"RDP",                 p:0.80, c:160},
        {n:"MHEC",                p:0.30, c:275},
      ],
      process:"Yellow oxide provides warm ivory tone. Contact us for process flow.",
      equipment:["Ribbon blender","Spectrophotometer"] },
    { id:"dm10", name:"Cementitious Grout — Coffee Brown", sub:"CG2, deep brown blend", score:87, tags:["grout","brown"],
      ingredients:[
        {n:"White Cement OPC 53", p:40,   c:18.5},
        {n:"Dolomite 325 mesh",   p:56.9, c:3},
        {n:"Black Iron Oxide",    p:3,    c:180},
        {n:"Red Iron Oxide",      p:5,    c:160},
        {n:"RDP",                 p:0.80, c:160},
        {n:"MHEC",                p:0.30, c:275},
      ],
      process:"Black and red oxide blend creates coffee brown. Pre-blend oxides before introduction to main mix. Contact us for process flow.",
      equipment:["Ribbon blender","Spectrophotometer"] },
    { id:"dm11", name:"Non-Shrink Cement Grout", sub:"Precision grouting, aluminium powder expansive", score:92, tags:["grout","non-shrink"],
      ingredients:[
        {n:"OPC 53 grey cement",  p:60,   c:5.5},
        {n:"Sand 30/80 mesh",     p:20,   c:1.8},
        {n:"Sand 50/120 mesh",    p:15,   c:1.8},
        {n:"Aluminium Powder",    p:0.20, c:450},
        {n:"SMF Superplasticiser",p:0.60, c:130},
        {n:"Silica Fume",         p:5,    c:30},
      ],
      process:"Aluminium powder generates controlled gas expansion to compensate for shrinkage. SMF superplasticiser provides flowability. Silica fume boosts strength. Aluminium powder handling requires safety precautions. Contact us for safety SOP and process flow.",
      equipment:["High-shear mixer","Expansion measurement mold","Compressive press","Flow cone"] },
    { id:"dm12", name:"Floor Hardener (Dry Shake)", sub:"Surface densifier, IS:15491", score:83, tags:["floor hardener"],
      ingredients:[
        {n:"OPC 53 grey cement",  p:35,   c:5.5},
        {n:"Sand 30/80 mesh",     p:47,   c:1.8},
        {n:"Sand 8 mesh (coarse)",p:15,   c:1.8},
        {n:"SMF Superplasticiser",p:0.35, c:130},
        {n:"Silica Fume",         p:3,    c:30},
      ],
      process:"Dry-shake floor hardener applied onto fresh concrete and power-trowelled in. Coarse sand provides aggregate interlock; silica fume densifies the surface matrix. Applied at 3–5 kg/m². Contact us for detailed application SOP and process flow.",
      equipment:["Ribbon blender","Power trowel (application)","Abrasion tester"] },
    { id:"dm13", name:"Microconcrete", sub:"Structural repair, high strength", score:94, tags:["repair","microconcrete"],
      ingredients:[
        {n:"OPC 53 grey cement",  p:35,   c:5.5},
        {n:"Sand 30/80 mesh",     p:30,   c:1.8},
        {n:"Sand 8 mesh (coarse)",p:30,   c:1.8},
        {n:"SMF Superplasticiser",p:0.35, c:130},
        {n:"RDP",                 p:2,    c:160},
        {n:"Silica Fume",         p:3,    c:30},
      ],
      process:"High-strength repair mortar with dual sand grading for optimum packing. SMF provides flowability; RDP improves adhesion to substrate. Silica fume fills micro-pores and boosts compressive strength. Contact us for detailed process flow and QC protocol.",
      equipment:["Pan mixer","40 mm cube molds","Pull-off tester","UPV meter","Compressive press"] },
  ],

  paints:[
    { id:"pt1", name:"Distemper (Water-based)", sub:"Economy interior, IS:428 compliant", score:76, tags:["distemper","IS:428"], free:true,
      ingredients:[
        {n:"Water",                            p:26,  c:0.10},
        {n:"Sodium Hexametaphosphate",         p:0.20,c:150},
        {n:"Dispersant & Wetting Agent",       p:0.50,c:100},
        {n:"MEG",                              p:0.50,c:60},
        {n:"Defoamer / Kerosene",              p:0.50,c:80},
        {n:"TiO2 Anatase",                     p:6.20,c:220},
        {n:"Dolomite",                         p:26.5,c:3.5},
        {n:"China Clay",                       p:7,   c:4},
        {n:"Chalk White",                      p:22,  c:3.3},
        {n:"HEC",                              p:0.10,c:385},
        {n:"Styrene Acrylic Emulsion 50%",     p:10,  c:90},
        {n:"Wax Emulsion",                     p:0.50,c:120},
      ],
      process:"Distemper is a water-based economy paint manufactured by slurrying pigments and fillers in water with dispersants, followed by let-down with styrene acrylic emulsion. HEC provides viscosity control. The process requires a high-speed disperser followed by a let-down tank. Contact us for Process Flow Diagram.",
      equipment:["High-speed disperser","KU viscometer","pH meter","Drawdown applicator"] },
    { id:"pt2", name:"Acrylic Emulsion — Interior Matt (IS:1384)", sub:"Styrene acrylic, TiO2 anatase", score:83, tags:["interior","matt","IS:1384"], free:true,
      ingredients:[
        {n:"Water",                            p:40,  c:0.10},
        {n:"Sodium Hexametaphosphate",         p:0.20,c:150},
        {n:"Dispersant / Wetting Agent",       p:0.30,c:100},
        {n:"MEG",                              p:0.70,c:60},
        {n:"Fungicide / Herbicide",            p:0.10,c:140},
        {n:"Defoamer / Kerosene",              p:3,   c:80},
        {n:"TiO2 Anatase",                     p:16,  c:220},
        {n:"Dolomite",                         p:4,   c:3.5},
        {n:"Thickener",                        p:0.10,c:65},
        {n:"HEC",                              p:0.20,c:385},
        {n:"Styrene Acrylic Emulsion 50%",     p:40,  c:90},
        {n:"Wax Emulsion",                     p:1,   c:120},
      ],
      process:"Interior matt emulsion paint manufactured by dispersion of TiO2 and fillers in water using a Cowles disperser, followed by let-down with styrene acrylic emulsion. HEC and thickener build viscosity. Contact us for Process Flow Diagram.",
      equipment:["High-speed disperser","KU viscometer","pH meter","Hiding power panel"] },
    { id:"pt3", name:"Acrylic Emulsion — Interior Satin (IS:1384)", sub:"Higher TiO2, higher emulsion, satin sheen", score:87, tags:["interior","satin","IS:1384"], free:true,
      ingredients:[
        {n:"Water",                            p:13,  c:0.10},
        {n:"Sodium Hexametaphosphate",         p:0.20,c:150},
        {n:"Dispersant / Wetting Agent",       p:0.30,c:100},
        {n:"MEG",                              p:1.20,c:60},
        {n:"Fungicide",                        p:0.10,c:140},
        {n:"Defoamer / Kerosene",              p:3,   c:80},
        {n:"TiO2 Anatase",                     p:24,  c:220},
        {n:"Chalk White",                      p:2,   c:3},
        {n:"Thickener",                        p:0.10,c:65},
        {n:"HEC",                              p:0.20,c:385},
        {n:"Styrene Acrylic Emulsion 50%",     p:60,  c:90},
        {n:"Wax Emulsion",                     p:1,   c:120},
      ],
      process:"Satin finish requires higher emulsion and TiO2 content vs matt. The higher PVC contributes to sheen. Dispersion sequence is identical to matt but emulsion let-down volume is higher. Contact us for Process Flow Diagram.",
      equipment:["High-speed disperser","Gloss meter @60°","KU viscometer"] },
    { id:"pt4", name:"Acrylic Emulsion — Exterior Satin", sub:"Acrylic emulsion 50%, UV stabilised", score:90, tags:["exterior","satin","acrylic"], free:true,
      ingredients:[
        {n:"Water",                            p:19,  c:0.10},
        {n:"Sodium Hexametaphosphate",         p:0.20,c:150},
        {n:"Dispersant / Wetting Agent",       p:0.30,c:100},
        {n:"MEG",                              p:1,   c:60},
        {n:"Fungicide",                        p:0.10,c:140},
        {n:"Defoamer / Kerosene",              p:1,   c:80},
        {n:"UV Absorber / HALS",               p:0.20,c:300},
        {n:"TiO2 Rutile",                      p:20,  c:360},
        {n:"Mica",                             p:11,  c:12},
        {n:"China Clay",                       p:3,   c:4},
        {n:"Thickener",                        p:0.70,c:65},
        {n:"HEC",                              p:0.30,c:385},
        {n:"Acrylic Emulsion 50%",             p:48,  c:130},
        {n:"Wax Emulsion",                     p:1,   c:80},
      ],
      process:"Exterior satin emulsion using pure acrylic emulsion and rutile TiO2 for UV durability. Mica platelet fillers reduce sheen and improve dirt pick-up resistance. HALS stabiliser extends weathering life. Contact us for Process Flow Diagram.",
      equipment:["High-speed disperser","QUV weathering chamber","Gloss meter","Wet scrub tester"] },
    { id:"pt5", name:"Acrylic Emulsion — Exterior Matt", sub:"Acrylic, mica-filled, economy exterior", score:85, tags:["exterior","matt","acrylic"],
      ingredients:[
        {n:"Water",                            p:39,  c:0.10},
        {n:"Sodium Hexametaphosphate",         p:0.20,c:150},
        {n:"Dispersant / Wetting Agent",       p:0.40,c:100},
        {n:"MEG",                              p:1.20,c:60},
        {n:"Fungicide",                        p:0.10,c:140},
        {n:"Defoamer / Kerosene",              p:1,   c:80},
        {n:"UV Absorber / HALS",               p:0.20,c:300},
        {n:"TiO2 Rutile",                      p:13,  c:360},
        {n:"Mica",                             p:10,  c:12},
        {n:"Aluminium Silicate",               p:4,   c:6},
        {n:"Calcite",                          p:6,   c:4},
        {n:"China Clay",                       p:2,   c:4},
        {n:"Thickener",                        p:0.40,c:65},
        {n:"HEC",                              p:0.30,c:385},
        {n:"Acrylic Emulsion 50%",             p:27,  c:102},
        {n:"Wax",                              p:1,   c:80},
      ],
      process:"Economy exterior matt with partial mica and aluminium silicate replacement of TiO2. HALS UV stabiliser extends performance. Contact us for Process Flow Diagram.",
      equipment:["High-speed disperser","QUV chamber","Gloss meter"] },
    { id:"pt6", name:"Black Japan (CNSL-Alkyd)", sub:"CNSL resin based, IS:341", score:84, tags:["black japan","CNSL","IS:341"],
      ingredients:[
        {n:"Carbon Black",                     p:1.75,c:130},
        {n:"Lead Octoate 24%",                 p:0.75,c:120},
        {n:"Manganese Octoate 10%",            p:0.12,c:163},
        {n:"Cobalt Octoate 12%",               p:0.05,c:425},
        {n:"Zinc Octoate 18%",                 p:0.50,c:160},
        {n:"CNSL Resin 70%",                   p:35,  c:80},
        {n:"Alkyd Long Oil Soya 60%",          p:3.50,c:150},
        {n:"Wetting Agent",                    p:0.30,c:93},
        {n:"Dispersant",                       p:0.20,c:65},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"Kerosene",                         p:57.5,c:80},
      ],
      process:"Black japan is a CNSL-alkyd blend pigmented with carbon black. Carbon black dispersion requires prolonged high-shear milling (bead mill minimum 45 min) to achieve jetness. Drier metals are added after grinding. Contact us for Process Flow Diagram.",
      equipment:["Bead mill / triple roll mill","Jetness meter","Drying recorder","KU viscometer"] },
    { id:"pt7", name:"Red Oxide Primer (CNSL-Alkyd, Solvent)", sub:"Anti-corrosive primer, IS:2074", score:86, tags:["primer","red oxide","CNSL","IS:2074"],
      ingredients:[
        {n:"Red Oxide",                        p:20,  c:130},
        {n:"Lead Octoate 24%",                 p:0.75,c:120},
        {n:"Manganese Octoate 10%",            p:0.12,c:163},
        {n:"Cobalt Octoate 12%",               p:0.05,c:425},
        {n:"Zinc Octoate 18%",                 p:0.50,c:160},
        {n:"Aluminium Stearate",               p:0.50,c:90},
        {n:"CNSL Resin 70%",                   p:23.5,c:80},
        {n:"Alkyd Pure Soya",                  p:2.50,c:150},
        {n:"Wetting Agent",                    p:0.30,c:92},
        {n:"Dispersant",                       p:0.20,c:65},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"MEG",                              p:0.50,c:60},
        {n:"Kerosene",                         p:45,  c:80},
        {n:"Talc",                             p:25,  c:3.5},
      ],
      process:"Red oxide primer based on CNSL-alkyd blend. Red oxide and talc are ground in part CNSL resin and kerosene to Hegman 4-5 fineness. Aluminium stearate prevents settling. Contact us for Process Flow Diagram.",
      equipment:["Bead mill / triple roll mill","Salt spray cabinet","Cross-cut adhesion tester"] },
    { id:"pt8", name:"White Alkyd Enamel (IS:133)", sub:"Long oil alkyd, high gloss", score:88, tags:["enamel","alkyd","white","IS:133"],
      ingredients:[
        {n:"Alkyd Resin Long Oil 100%",        p:24,  c:150},
        {n:"TiO2 Rutile",                      p:20,  c:360},
        {n:"Lead Octoate 24%",                 p:0.75,c:120},
        {n:"Manganese Octoate 10%",            p:0.12,c:163},
        {n:"Cobalt Octoate 12%",               p:0.05,c:425},
        {n:"Zinc Octoate 18%",                 p:0.50,c:160},
        {n:"Wetting & Dispersing Agent",       p:0.50,c:92},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"Dolomite",                         p:5,   c:3.5},
        {n:"Kerosene",                         p:55,  c:80},
        {n:"MEG",                              p:2.50,c:60},
      ],
      process:"White alkyd enamel ground to Hegman 6-7 for high gloss. TiO2 dispersed in part alkyd + kerosene using bead mill or triple roll. Let-down with remaining alkyd and drier additions. Contact us for Process Flow Diagram.",
      equipment:["Bead mill / triple roll mill","Hegman gauge","Gloss meter","Drying recorder"] },
    { id:"pt9", name:"Post Office Red Alkyd Enamel", sub:"IS shade, CNSL-alkyd, IS:133", score:87, tags:["enamel","red","IS:133"],
      ingredients:[
        {n:"PO Red Pigment",                   p:3,   c:400},
        {n:"Lead Octoate 24%",                 p:0.94,c:120},
        {n:"Manganese Octoate 10%",            p:0.42,c:163},
        {n:"Cobalt Octoate 12%",               p:0.35,c:425},
        {n:"Zinc Octoate 18%",                 p:0.30,c:160},
        {n:"CNSL Resin 70%",                   p:55,  c:80},
        {n:"Alkyd Pure Soya",                  p:5,   c:150},
        {n:"Wetting Agent",                    p:0.30,c:92},
        {n:"Dispersant",                       p:0.20,c:65},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"MEG",                              p:0.50,c:60},
        {n:"Kerosene",                         p:34,  c:80},
      ],
      process:"PO red enamel uses speciality PO red pigment which requires careful dispersion in CNSL-alkyd blend. Shade matching to IS Post Office Red standard using spectrophotometer. Contact us for Process Flow Diagram.",
      equipment:["Bead mill","Spectrophotometer","Gloss meter"] },
    { id:"pt10", name:"Bus Green Alkyd Enamel", sub:"Chrome green, CNSL-alkyd", score:86, tags:["enamel","green","IS:133"],
      ingredients:[
        {n:"Chrome Green",                     p:15,  c:200},
        {n:"Lead Octoate 24%",                 p:0.75,c:120},
        {n:"Manganese Octoate 10%",            p:0.30,c:163},
        {n:"Cobalt Octoate 12%",               p:0.25,c:425},
        {n:"Zinc Octoate 18%",                 p:0.30,c:160},
        {n:"CNSL Resin 70%",                   p:47,  c:80},
        {n:"Alkyd Pure Soya",                  p:4,   c:150},
        {n:"Wetting Agent",                    p:0.30,c:92},
        {n:"Dispersant",                       p:0.20,c:65},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"MEG",                              p:0.50,c:60},
        {n:"Kerosene",                         p:37,  c:80},
      ],
      process:"Bus green uses chrome green pigment dispersed in CNSL-alkyd. Chrome green is relatively easy to disperse vs organic pigments. Contact us for Process Flow Diagram.",
      equipment:["Bead mill","Spectrophotometer","Gloss meter"] },
    { id:"pt11", name:"Dark Smoke Grey Alkyd Enamel", sub:"Carbon black + TiO2 + Prussian blue blend", score:86, tags:["enamel","grey","IS:133"],
      ingredients:[
        {n:"Carbon Black",                     p:0.50,c:130},
        {n:"Lead Octoate 24%",                 p:0.75,c:120},
        {n:"TiO2 Rutile",                      p:15,  c:360},
        {n:"Prussian Blue",                    p:0.50,c:400},
        {n:"Manganese Octoate 10%",            p:0.30,c:163},
        {n:"Cobalt Octoate 12%",               p:0.25,c:425},
        {n:"CNSL Resin 70%",                   p:50,  c:80},
        {n:"Alkyd Pure Soya",                  p:4,   c:150},
        {n:"Wetting Agent",                    p:0.30,c:92},
        {n:"Dispersant",                       p:0.20,c:65},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"MEG",                              p:0.50,c:60},
        {n:"Kerosene",                         p:35,  c:80},
      ],
      process:"Complex shade requiring three pigments. Carbon black must be milled separately first, then combined with TiO2 and Prussian blue grinds. Shade adjust with spectrophotometer. Contact us for Process Flow Diagram.",
      equipment:["Bead mill","Spectrophotometer","Gloss meter"] },
    { id:"pt12", name:"Aluminium Paint", sub:"Aluminium paste, CNSL-alkyd base", score:85, tags:["enamel","aluminium","IS:2339"],
      ingredients:[
        {n:"Aluminium Paste",                  p:8,   c:400},
        {n:"Lead Octoate 24%",                 p:0.75,c:120},
        {n:"Manganese Octoate 10%",            p:0.30,c:163},
        {n:"Cobalt Octoate 12%",               p:0.25,c:425},
        {n:"CNSL Resin 70%",                   p:50,  c:80},
        {n:"Alkyd Pure Soya",                  p:4,   c:150},
        {n:"Wetting Agent",                    p:0.30,c:92},
        {n:"Dispersant",                       p:0.20,c:65},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"MEG",                              p:0.50,c:60},
        {n:"Kerosene",                         p:36,  c:40},
      ],
      process:"Aluminium paste must be added last at low speed to preserve flake orientation. Do NOT use high shear — aluminium flakes will be destroyed, losing leafing effect. Contact us for Process Flow Diagram.",
      equipment:["Low-shear paddle mixer","Leafing test panel","Gloss meter"] },
    { id:"pt13", name:"Olive Green Alkyd Enamel", sub:"Chrome green + carbon black + chrome yellow blend", score:86, tags:["enamel","olive green"],
      ingredients:[
        {n:"Chrome Green",                     p:10,  c:200},
        {n:"Lead Octoate 24%",                 p:0.75,c:120},
        {n:"Carbon Black",                     p:0.19,c:130},
        {n:"Middle Chrome Yellow",             p:0.58,c:200},
        {n:"Manganese Octoate 10%",            p:0.30,c:163},
        {n:"Cobalt Octoate 12%",               p:0.25,c:425},
        {n:"Zinc Octoate 18%",                 p:0.30,c:160},
        {n:"CNSL Resin 70%",                   p:55,  c:80},
        {n:"Alkyd Pure Soya",                  p:4,   c:150},
        {n:"Wetting Agent",                    p:0.30,c:92},
        {n:"Dispersant",                       p:0.20,c:65},
        {n:"Anti-skinning Agent",              p:0.30,c:200},
        {n:"MEG",                              p:0.50,c:60},
        {n:"Kerosene",                         p:33,  c:80},
      ],
      process:"Olive green blend of chrome green, carbon black and chrome yellow. Mill each pigment separately then combine for shade. Contact us for Process Flow Diagram.",
      equipment:["Bead mill","Spectrophotometer","Gloss meter"] },
    { id:"pt14", name:"Epoxy Red Oxide Primer (2K, IS:13238)", sub:"DGEBA + DETA adduct hardener", score:95, tags:["primer","epoxy","red oxide","2K"],
      ingredients:[
        {n:"DGEBA Epoxy Resin EEW 190 (Part A)",p:39.5,c:280},
        {n:"Xylene (Part A)",                   p:23.7,c:120},
        {n:"Red Oxide (Part A)",                p:11,  c:130},
        {n:"Aerosil (Part A)",                  p:0.85,c:200},
        {n:"Epoxy-DETA Adduct 1:1 (Part B)",    p:13.3,c:300},
        {n:"Xylene (Part B)",                   p:11.7,c:120},
      ],
      process:"Two-component epoxy primer. Part A contains epoxy resin, pigments and thixotrope dispersed together. Part B is the DETA adduct hardener. Mixed at site at correct stoichiometric ratio. Stoichiometry must be calculated from EEW and AHEW. Contact us for detailed process and mix ratio calculation.",
      equipment:["Bead mill","Salt spray cabinet","DFT gauge","Pot life timer"] },
    { id:"pt15", name:"Epoxy Zinc Rich Primer (2K)", sub:"DGEBA + DETA adduct, >70% Zn DFT", score:97, tags:["primer","zinc rich","epoxy"],
      ingredients:[
        {n:"DGEBA Epoxy Resin EEW 190 (Part A)",p:39.5,c:280},
        {n:"Xylene (Part A)",                   p:23.7,c:120},
        {n:"Zinc Dust (Part A)",                p:11,  c:220},
        {n:"Aerosil (Part A)",                  p:0.85,c:200},
        {n:"Epoxy-DETA Adduct 1:1 (Part B)",    p:13.3,c:300},
        {n:"Xylene (Part B)",                   p:11.7,c:120},
      ],
      process:"Same two-component structure as epoxy primer but with zinc dust for cathodic protection. Zinc dust addition to Part A at LOW speed only — no high shear. Earthing and N2 blanketing mandatory. Contact us for detailed safety SOP and process flow.",
      equipment:["Earthed low-shear mixer","N2 blanketing","XRF analyser","Salt spray cabinet"] },
  ],

  coatings:[
    { id:"ct1", name:"Epoxy Floor Coating (2K, RT Cure)", sub:"Self-levelling, heavy duty industrial floor", score:93, tags:["epoxy","floor","RT cure","2K"], free:true,
      ingredients:[
        {n:"Bisphenol A Epoxy EEW190 (Part A)",p:38,  c:280},
        {n:"TiO2",                             p:8,   c:200},
        {n:"Silica Sand 0.1–0.3mm",            p:10,  c:3},
        {n:"Xylene",                           p:8,   c:30},
        {n:"Cycloaliphatic Amine (Part B)",     p:22,  c:300},
        {n:"Flow/levelling agent",              p:0.30,c:400},
        {n:"Defoamer",                          p:0.15,c:200},
      ],
      process:["Part A: Disperse TiO2 + silica sand in epoxy + xylene at medium shear 20 min","Add flow agent + defoamer","Pack Part A (shelf 12 months)","Part B: Cycloaliphatic amine hardener — pack separately","Site: Mix A:B = 3.5:1 wt., induction time 10 min, pot life 45–60 min @25 °C","Pour and spread self-levelling at 200–300 µm wet (notched squeegee)","De-air with spike roller","Full cure: 7 days @25 °C, walk-on at 24 h","QC: compressive strength >70 MPa, chemical resistance, gloss, Shore D >70"],
      equipment:["Paddle mixer","Notched squeegee","Spike roller (air release)","Shore D hardness tester","Chemical resistance panel"] },
    { id:"ct2", name:"Epoxy Clear Top Coat (2K)", sub:"High gloss, chemical resistant floor/wall", score:94, tags:["epoxy","clear","topcoat","2K"], free:true,
      ingredients:[
        {n:"Bisphenol F Epoxy (Part A)",    p:40,  c:320},
        {n:"Xylene / MEK",                  p:12,  c:30},
        {n:"Flow agent",                    p:0.30,c:400},
        {n:"UV Stabiliser",                 p:0.50,c:500},
        {n:"Cycloaliphatic Amine (Part B)", p:22,  c:300},
      ],
      process:["Part A: Blend epoxy + solvents + flow agent + UV stabiliser at low shear","Pack Part A","Part B: Cycloaliphatic amine hardener","Site mix A:B = 3:1 wt., pot life 60–90 min","Apply by squeegee + back-roll at 40–60 µm DFT","Full cure: 7 days @25 °C","QC: MEK double rub >200, gloss >90 @60°, pencil hardness >2H"],
      equipment:["Paddle mixer","Roller + squeegee","MEK rub tester","Gloss meter","Pencil hardness set"] },
    { id:"ct3", name:"Pigmented Epoxy Top Coat (2K)", sub:"Industrial, IS shade RAL/BS colours", score:93, tags:["epoxy","topcoat","2K"], free:true,
      ingredients:[
        {n:"Bisphenol A Epoxy (Part A)",    p:35,  c:280},
        {n:"TiO2",                          p:10,  c:200},
        {n:"Carbon Black (for grey shade)",  p:0.50,c:150},
        {n:"Micronised Talc",               p:8,   c:12},
        {n:"Xylene",                        p:10,  c:30},
        {n:"Flow agent",                    p:0.30,c:400},
        {n:"Cycloaliphatic Amine (Part B)", p:22,  c:300},
      ],
      process:["Part A: Disperse TiO2 + CB + talc in epoxy + xylene at 2000 rpm, 30 min","Grind to Hegman 5","Add flow agent","Pack Part A","Site mix with Part B amine at 3:1 wt.","Apply 60–80 µm DFT, 2 coats (sand between coats at 24 h)","QC: gloss >80 @60°, adhesion, chemical resistance"],
      equipment:["Bead mill","DFT gauge","Chemical resistance tester","Gloss meter"] },
    { id:"ct4", name:"Stoving Alkyd Enamel (Melamine-Alkyd)", sub:"Bake 130 °C / 30 min, OEM / industrial", score:90, tags:["stoving","alkyd","melamine"],
      ingredients:[
        {n:"Short-oil Alkyd Resin 60%",  p:40,  c:100},
        {n:"Melamine Formaldehyde 55%",  p:20,  c:160},
        {n:"TiO2 Rutile",                p:18,  c:200},
        {n:"CaCO3 2µm",                  p:5,   c:6},
        {n:"Xylene / Butanol 1:1",       p:12,  c:32},
        {n:"p-TSA Acid Catalyst",        p:0.15,c:180},
        {n:"Flow agent",                 p:0.30,c:400},
      ],
      process:["Disperse TiO2 in alkyd + solvent at 2500 rpm, 25 min","Grind Hegman 6–7 (bead mill)","Let-down with melamine formaldehyde resin + remaining alkyd","Add acid catalyst + flow agent","Apply by spray at 40–50 µm DFT wet","Stove 130 °C / 30 min in conveyor oven (or 150 °C / 20 min)","QC: MEK double rub >100, pencil hardness ≥2H, gloss >85 @60°, cross-hatch adhesion"],
      equipment:["Bead mill","Stoving oven (conveyor)","MEK rub tester","Pencil hardness set","Gloss meter"] },
    { id:"ct5", name:"Stoving Polyester Enamel (Coil Coating)", sub:"220–240 °C PMT, pre-painted steel / aluminium", score:96, tags:["stoving","polyester","coil coating"],
      ingredients:[
        {n:"Hydroxyl Polyester Resin (Part A)",p:45,  c:140},
        {n:"HMMM Melamine Crosslinker (Part B)",p:18, c:200},
        {n:"TiO2 Rutile",                      p:18,  c:200},
        {n:"BaSO4 Blanc Fixe",                 p:5,   c:22},
        {n:"Cyclohexanone / Solvesso 150",     p:10,  c:45},
        {n:"DNNSA Acid Catalyst",              p:0.30,c:200},
        {n:"Flow / wax additive",              p:0.50,c:400},
      ],
      process:["Disperse TiO2 + BaSO4 in polyester + solvent, 25 min, bead mill to Hegman 6+","Let-down with HMMM crosslinker + catalyst + flow/wax additive","Apply by roll coater at 20–25 µm DFT dry","Stove at PMT 220–240 °C (peak metal temperature), 20–25 s in oven","QC: T-bend 0T no crack, MEK rub >80, reverse impact 80 in-lb, Erichsen >6 mm"],
      equipment:["3-roll bead mill","Coil coating roll coater","Induction oven","T-bend tester","MEK rub set","Reverse impact tester","Erichsen cupping"] },
    { id:"ct6", name:"Epoxy Powder Coating (Stoving, TGIC-free)", sub:"100% solids, 180–200 °C cure, high build", score:95, tags:["powder coating","stoving","epoxy"],
      ingredients:[
        {n:"Bisphenol A Epoxy solid EEW700",p:50,  c:130},
        {n:"DICY Hardener",                 p:5,   c:180},
        {n:"TiO2 Rutile",                   p:20,  c:200},
        {n:"BaSO4",                         p:12,  c:22},
        {n:"Resiflow P67 (flow agent)",     p:0.80,c:400},
        {n:"Benzoin (degassing agent)",     p:0.30,c:200},
      ],
      process:["Dry blend all ingredients in high-speed mixer 2 min (pre-mix)","Melt-extrude in twin-screw extruder at 90–100 °C barrel temperature","Cool on chill rolls, chip, grind in ACM mill to D50 30–50 µm","Classify to remove >100 µm particles","Apply by electrostatic spray gun (60–80 kV, 60–80 µm target film)","Cure in oven 180–200 °C / 15–20 min","QC: film thickness, gloss >85 @60°, MEK rub >80, cross-cut adhesion, impact resistance"],
      equipment:["Twin-screw extruder","ACM powder mill","Air classifier","Electrostatic spray gun","Cure oven","Laser particle sizer","MEK rub set"] },
    { id:"ct7", name:"PU Waterproof Coating (1K Moisture-cure)", sub:"Roof deck / terrace, elongation >300%", score:96, tags:["PU","waterproof","1K"],
      ingredients:[
        {n:"MDI Prepolymer NCO 3%",  p:80,  c:320},
        {n:"Xylene",                 p:10,  c:30},
        {n:"Carbon Black / Pigment", p:3,   c:150},
        {n:"Molecular Sieve 3A",     p:2,   c:180},
        {n:"DBTL Catalyst",          p:0.05,c:800},
      ],
      process:["STRICTLY DRY: RH <50%, all equipment oven-dried at 80 °C before use","Blend MDI prepolymer + xylene + molecular sieve powder at low speed","Add pigment + catalyst last, mix 10 min","Fill into cartridges/containers under N2 blanket","Apply at 60–80 µm DFT per coat, 2–3 coats for 2 mm waterproofing","Moisture from air cures: tack-free 2 h, full cure 24 h","QC: elongation >300%, tensile strength >3 MPa, water vapour transmission"],
      equipment:["Dry SS vessel with N2 blanketing","Cartridge filler","Tensile/elongation tester","Moisture meter"] },
    { id:"ct8", name:"Aliphatic PU Top Coat (2K, UV stable)", sub:"High gloss exterior metal / concrete, 2000 h QUV", score:97, tags:["PU","topcoat","2K","UV-stable"],
      ingredients:[
        {n:"Aliphatic Polyol OH 120 (Part A)",p:45,  c:400},
        {n:"HDI Trimer NCO 21.8% (Part B)",   p:22,  c:600},
        {n:"TiO2",                            p:12,  c:200},
        {n:"Xylene / Butyl Acetate",          p:12,  c:32},
        {n:"HALS UV Stabiliser",              p:0.50,c:600},
        {n:"Flow agent",                      p:0.30,c:400},
      ],
      process:["Part A: Disperse TiO2 in polyol + solvents at 2000 rpm, 25 min","Add HALS + flow agent, mix 10 min","Pack Part A","Part B: HDI trimer isocyanate — pack separately","Site mix A:B at NCO:OH = 1.05:1 molar ratio, induction 15 min, pot life 3–4 h","Apply by spray at 40–50 µm DFT per coat","QC: 2000 h QUV gloss retention >80%, pencil hardness ≥H, adhesion"],
      equipment:["Bead mill","HVLP spray gun","QUV weathering chamber 2000 h","Gloss meter","Pot life timer"] },
    { id:"ct9", name:"Elastomeric Waterproof Acrylic Coating", sub:"Crack-bridging, exterior roof/wall", score:90, tags:["waterproof","acrylic","elastomeric"],
      ingredients:[
        {n:"Water",                         p:25,  c:0.05},
        {n:"Acrylic Elastomeric Emulsion",  p:42,  c:150},
        {n:"TiO2",                          p:10,  c:200},
        {n:"CaCO3",                         p:12,  c:5},
        {n:"HEUR Thickener",                p:0.70,c:280},
        {n:"Dispersant",                    p:0.40,c:200},
        {n:"Biocide",                       p:0.20,c:600},
        {n:"Coalescent",                    p:2,   c:180},
      ],
      process:["Disperse TiO2 + CaCO3 in water + dispersant at 2000 rpm, 20 min","Let-down with elastomeric acrylic emulsion at low speed","Add HEUR thickener + biocide + coalescent","Adjust pH 8–9, viscosity 120–140 KU","QC: crack bridging at -10 °C, elongation >200%, 1000 h QUV, water absorption"],
      equipment:["High-speed disperser","Crack bridge tester","QUV chamber","Tensile tester","KU viscometer"] },
    { id:"ct10", name:"RTV Silicone Coating (Room Temp Vulcanising)", sub:"High-temp, release, electrical insulation", score:95, tags:["RTV silicone","coating","high-temp"],
      ingredients:[
        {n:"PDMS Vinyl terminated 500 cst",p:60,  c:350},
        {n:"Silicone Crosslinker (HMS)",   p:8,   c:280},
        {n:"Fumed Silica (reinforcement)", p:15,  c:180},
        {n:"Pt Catalyst (Karstedt)",       p:0.05,c:8000},
        {n:"Inhibitor (1-Ethynyl-3-ol)",   p:0.10,c:400},
        {n:"Xylene / VM&P Naphtha",        p:15,  c:32},
      ],
      process:["MOISTURE EXCLUSION: all raw materials <50 ppm water","Part A: Blend PDMS + fumed silica + Pt catalyst + inhibitor + solvent at low shear under vacuum 30 min","Part B: HMS crosslinker in solvent","Mix A:B = 10:1 at application point (or 1-component with inhibitor for open time)","Apply by spray/dip/roll at 50–150 µm DFT","Cure: RT 2–4 h (addition cure, no by-product)","QC: Shore A 40–60, elongation >200%, volume resistivity, high-temp ageing 200 °C/1000 h"],
      equipment:["Vacuum planetary mixer","N2 blanketing","Shore A tester","Volume resistivity meter","High-temp oven"] },
  ],

  adhesives:[
    { id:"ad1", name:"Epoxy General Purpose Adhesive (2K)", sub:"1:1 or 2:1 ratio, structural bonding", score:92, tags:["epoxy","2K","structural"], free:true,
      ingredients:[
        {n:"Bisphenol A Epoxy EEW190 (Part A)",p:50,  c:280},
        {n:"CaCO3 filler",                     p:10,  c:5},
        {n:"Talc",                             p:5,   c:12},
        {n:"Cycloaliphatic Amine (Part B)",    p:30,  c:300},
        {n:"Accelerator DMP-30",               p:0.50,c:400},
      ],
      process:["Part A: Blend epoxy + fillers in planetary mixer under vacuum 20 min, degas","Pack Part A in dual-cartridge syringe (1:1 or 2:1)","Part B: Amine + accelerator, pack separately","Application: mix with static nozzle","Pot life: 5 min, fixture strength: 30 min, full cure: 24 h @25 °C","QC: lap shear on steel >15 MPa, T-peel, Shore D hardness"],
      equipment:["Planetary vacuum mixer","Dual-cartridge filling line","Lap shear test jig","Shore D set"] },
    { id:"ad2", name:"PU Wood Glue (1K Moisture Cure, D4)", sub:"Waterproof EN204 D4, joinery, finger jointing", score:91, tags:["PU","wood glue","D4","waterproof"], free:true,
      ingredients:[
        {n:"MDI Prepolymer NCO 8–10%",p:88,  c:280},
        {n:"Molecular Sieve 3A",      p:2,   c:180},
        {n:"Plasticiser DIDP",        p:8,   c:60},
        {n:"DBTL Catalyst",           p:0.05,c:800},
        {n:"Pigment (optional)",      p:0.50,c:200},
      ],
      process:["ALL equipment strictly moisture-free (oven-dry at 80 °C)","Blend MDI prepolymer + plasticiser at 60–70 °C, low speed, N2 purge","Add molecular sieve powder, mix 10 min","Add catalyst + pigment, mix 5 min, degas under vacuum","Fill into cartridges / tubes under N2 immediately","Shelf life: 12 months sealed / 9 months in cartridge","Cure: moisture from wood, 24 h full cure, 4–6 h working strength","QC: EN204 D4 wet tensile strength >10 MPa, wood failure >80%"],
      equipment:["N2-purged earthed SS reactor","Vacuum pump","Cartridge filler","EN204 D4 test jig"] },
    { id:"ad3", name:"PVAc Wood Glue (1K Water-based, D2/D3)", sub:"White glue, interior carpentry, school glue", score:85, tags:["PVAc","wood glue","D2"], free:true,
      ingredients:[
        {n:"PVAc Emulsion 55%",  p:70,  c:60},
        {n:"Water",              p:15,  c:0.05},
        {n:"Plasticiser DBP",    p:3,   c:70},
        {n:"HPMC thickener",     p:0.40,c:380},
        {n:"Preservative",       p:0.20,c:350},
        {n:"Defoamer",           p:0.10,c:200},
      ],
      process:["Add PVAc emulsion to paddle mixer at ambient temperature","Add plasticiser (DBP) at low speed, mix 10 min","Pre-dissolve HPMC in warm water, add to tank slowly","Add preservative + defoamer, mix 10 min","Adjust viscosity with water to 5000–10000 cps (Brookfield)","Fill into bottles","QC: EN204 D2/D3 bond strength, open time 10–15 min, tack, pH 4–5"],
      equipment:["Paddle mixer SS","Brookfield viscometer","EN204 test press","pH meter"] },
    { id:"ad4", name:"RTV Silicone Sealant (1K Acetoxy Cure)", sub:"General purpose — glass, aluminium, sanitary", score:93, tags:["RTV silicone","1K","acetoxy"], free:true,
      ingredients:[
        {n:"PDMS OH-terminated 50000 cst",  p:70,  c:350},
        {n:"Methyl Triacetoxy Silane (crosslinker)",p:5,c:180},
        {n:"CaCO3 surface treated",         p:18,  c:8},
        {n:"Fumed Silica",                  p:3,   c:180},
        {n:"Pigment white",                 p:1.5, c:200},
        {n:"DBTDA Tin Catalyst",            p:0.05,c:900},
      ],
      process:["MOISTURE EXCLUSION: all RM <50 ppm H2O — critical to shelf life","Blend PDMS + fumed silica + surface-treated CaCO3 in planetary mixer under full vacuum, 30 min","Add methyl triacetoxy silane crosslinker + DBTDA catalyst + pigment under vacuum, 15 min (acetoxy odour — ventilate)","Fill into cartridges under N2 blanket IMMEDIATELY (no delay — moisture ingress ruins batch)","Seal cartridges","Cure: atmospheric moisture, tack-free time 20–30 min, depth of cure 2–3 mm/day","QC: extrusion rate, tack-free time, Shore A 18–25, elongation >250%, adhesion to glass"],
      equipment:["Planetary vacuum mixer","N2 cartridge filler","Shore A tester","Tensile tester","Adhesion test on glass/aluminium"] },
    { id:"ad5", name:"RTV Silicone Sealant (2K Neutral Cure)", sub:"No corrosion, electronics, optical, structural glazing", score:95, tags:["RTV silicone","2K","neutral"],
      ingredients:[
        {n:"PDMS OH-terminated (Part A)",   p:72,  c:350},
        {n:"Fumed Silica (Part A)",          p:4,   c:180},
        {n:"Alkoxy Crosslinker VTMS (Part A)",p:3,  c:200},
        {n:"Plasticiser PDMS low MW",        p:10,  c:100},
        {n:"Filler / pigment (Part A)",      p:10,  c:10},
        {n:"Organotin Catalyst (Part B)",    p:0.10,c:900},
      ],
      process:["Part A: Blend PDMS + fumed silica + alkoxy silane + filler + plasticiser under vacuum 30 min in planetary mixer","Pack Part A in drum/cartridge under N2","Part B: Organotin catalyst in carrier — pack separately (10:1 ratio)","Site mix A:B via static mixer or manual stir","Cure: moisture from air, no by-product (no acetic acid smell — neutral cure)","Tack-free 1 h, full cure 24–48 h, Shore A 15–25","QC: no copper corrosion (1 week contact test), Shore A, elongation, tensile strength"],
      equipment:["Planetary vacuum mixer","Dual-pack cartridge filler","Copper corrosion test","Shore A + tensile tester"] },
    { id:"ad6", name:"Polysulphide Sealant (2K)", sub:"Fuel-resistant, expansion joints, aviation & civil", score:91, tags:["polysulphide","2K","joint sealant"],
      ingredients:[
        {n:"Liquid Polysulphide LP-2 (Part A)",p:60, c:280},
        {n:"CaCO3 coated (Part A)",            p:22, c:8},
        {n:"Carbon Black (Part A)",            p:2,  c:150},
        {n:"Plasticiser DOP (Part A)",         p:5,  c:55},
        {n:"MnO2 Paste Curing Agent (Part B)", p:10, c:120},
        {n:"Retarder Stearic Acid (Part B)",   p:0.20,c:80},
      ],
      process:["Part A: Mix LP-2 polymer + CaCO3 + CB + DOP in Z-blade or sigma mixer 20 min, degas under vacuum","Pack Part A in tubs / cartridges","Part B: MnO2 paste + stearic acid retarder — pre-blended, pack separately","Site mix A:B = 6:1 by weight with paddle or mechanical mixer, pot life 2–3 h @25 °C","Apply by gun into primed joint, tool smooth within 30 min","Cure: 24–72 h @25 °C to Shore A 25–40","QC: EN ISO 11600 movement accommodation factor ±25%, jet fuel resistance, water immersion 7 days"],
      equipment:["Z-blade / sigma mixer","Tub + cartridge filler","Shore A tester","Movement rig","Chemical resistance panel"] },
    { id:"ad7", name:"Acrylic PSA (Pressure Sensitive Adhesive)", sub:"Self-adhesive labels, tapes, removable to permanent", score:89, tags:["PSA","acrylic"],
      ingredients:[
        {n:"2-EHA (2-Ethylhexyl Acrylate)",    p:60,  c:90},
        {n:"Vinyl Acetate",                    p:20,  c:55},
        {n:"Acrylic Acid",                     p:5,   c:65},
        {n:"AIBN Initiator",                   p:0.30,c:400},
        {n:"Ethyl Acetate (solvent)",           p:14,  c:30},
        {n:"Al-acetylacetonate crosslinker",   p:0.10,c:400},
      ],
      process:["Charge monomers + ethyl acetate + AIBN in N2-purged reactor","Polymerise semi-batch at 75–80 °C, 5–6 h (add remaining monomer portion by portion)","Check solids content ≥40–45% (conversion check)","Add crosslinker at end, mix 15 min","Coat on release liner at 20–25 µm dry via comma or slot-die coater","Dry 80–100 °C / 3 min","QC: PSTC-1 180° peel, PSTC-7 loop tack, PSTC-2 shear hold"],
      equipment:["N2-purged reactor with reflux","Semi-batch pump","Slot-die / comma coater","Drying oven","PSTC peel/tack/shear tester"] },
    { id:"ad8", name:"BOPP Tape Adhesive (Acrylic Solvent)", sub:"OPP film carrier, packaging tape", score:87, tags:["BOPP","tape","acrylic"],
      ingredients:[
        {n:"2-EHA",                         p:65,  c:90},
        {n:"Vinyl Acetate",                 p:18,  c:55},
        {n:"Acrylic Acid",                  p:5,   c:65},
        {n:"AIBN Initiator",                p:0.30,c:400},
        {n:"Toluene",                       p:11,  c:25},
        {n:"Al-acac crosslinker",           p:0.10,c:400},
      ],
      process:["Polymerise as PSA process (N2 purged, 75–80 °C, semi-batch, 6 h)","Target Mw 500–700 kDa (verify by GPC)","Apply on corona-treated BOPP film at 18–22 µm dry via slot-die","Dry 80–100 °C / 2 min","Slit and rewind","QC: 180° peel on steel, loop tack >600 g/25mm, shear 24 h >5 h"],
      equipment:["N2 reactor","Corona treater","Slot-die coater","GPC for Mw","Peel/tack/shear tester"] },
    { id:"ad9", name:"PU Lamination Adhesive (2K, Retort-stable)", sub:"Flexible food packaging, high temp stable", score:94, tags:["PU","lamination","2K"],
      ingredients:[
        {n:"Aliphatic Polyurethane Polyol (Part A)",p:55, c:200},
        {n:"Ethyl Acetate",                         p:20, c:30},
        {n:"MDI/HDI Isocyanate (Part B)",           p:20, c:350},
        {n:"DBTL Catalyst",                         p:0.05,c:800},
      ],
      process:["Dissolve Part A polyol in ethyl acetate, mix 15 min","Add Part B isocyanate to achieve NCO:OH = 1.1:1 molar ratio","Add catalyst, mix 5 min","Apply by gravure or comma coater at 2–3 g/m² dry weight","Laminate with second film through nip roll","Cure: 48–72 h @40 °C (retort grade: 7 days @50 °C)","QC: T-peel ≥300 g/25mm, solvent retention <5 ppm by GC headspace, hot tack"],
      equipment:["Gravure / comma coater","Nip roll laminator","Cure oven","T-peel tester","GC headspace for solvent"] },
    { id:"ad10", name:"Epoxy Grout (2K, Chemical Resistant)", sub:"Sanitary areas, food industry, acid-resistant joints", score:96, tags:["epoxy grout","2K"],
      ingredients:[
        {n:"Bisphenol A Epoxy + filler paste (Part A)",p:60, c:200},
        {n:"Graded Quartz 0–0.3mm",                    p:20, c:3},
        {n:"TiO2 / Pigment",                           p:3,  c:200},
        {n:"Cycloaliphatic Amine (Part B)",             p:16, c:300},
        {n:"Wetting agent",                             p:0.30,c:300},
      ],
      process:["Part A: Blend epoxy resin with graded quartz + TiO2 + wetting agent in planetary mixer, degas under vacuum","Pack Part A in pail / tray (A side)","Pack Part B cycloaliphatic amine separately","Site: Mix A:B = 3:1 by volume, pot life 30–45 min @25 °C","Apply grout into tile joints with rubber float","Clean excess within pot life with damp cloth","Full cure: 7 days @25 °C, do not grout in <10 °C","QC: EN13888 chemical resistance (10% H2SO4, 10% NaOH), compressive strength >45 MPa"],
      equipment:["Planetary vacuum mixer","Dual-pack pail line","Compressive press","Chemical resistance tanks"] },
    { id:"ad11", name:"UV Curing Adhesive (Acrylic, 1K)", sub:"Instant cure with UV lamp, glass/optical/medical devices", score:97, tags:["UV cure","acrylic","optical"],
      ingredients:[
        {n:"Urethane Acrylate Oligomer",         p:55,  c:450},
        {n:"TPGDA Reactive Diluent",             p:20,  c:150},
        {n:"HDDA Reactive Diluent",              p:10,  c:140},
        {n:"Irgacure 819 Photoinitiator",        p:3,   c:1200},
        {n:"MEHQ Inhibitor / Stabiliser",        p:0.05,c:400},
        {n:"Silane Adhesion Promoter",           p:1,   c:500},
      ],
      process:["DARK ROOM / YELLOW LIGHT: all operations exclude UV light","Blend oligomer + reactive diluents at low speed, 30 min — avoid UV exposure","Add photoinitiator (Irgacure 819) + MEHQ inhibitor + silane, mix 15 min under yellow light","Fill into amber UV-opaque syringes / cartridges immediately","Store at 4–8 °C away from light","Apply thin bead, assemble parts, cure with 365–405 nm UV at 1000–3000 mJ/cm² (5–30 s)","QC: lap shear on glass >8 MPa, optical clarity >95% transmission, depth of cure"],
      equipment:["Yellow-light room","Planetary mixer","UV LED conveyor / spot lamp","Radiometer","Lap shear jig","Optical clarity measurement"] },
    { id:"ad12", name:"Starch-Based Paper Glue (Seam & Lamination)", sub:"Anionic cooked starch, corrugator, book binding", score:82, tags:["starch","paper","seam"],
      ingredients:[
        {n:"Oxidised Corn / Tapioca Starch",p:18,  c:22},
        {n:"Water",                         p:75,  c:0.05},
        {n:"Borax Na2B4O7",                p:0.50, c:35},
        {n:"NaOH 10% solution",            p:0.80, c:5},
        {n:"Preservative",                 p:0.10, c:350},
      ],
      process:["Heat water to 70 °C in SS jacketed vessel","Slurry starch in 30% cold water separately (avoid lumps)","Add starch slurry slowly to hot water with anchor agitation","Cook at 85–90 °C, 20 min — full gelatinisation (Brookfield target 800–1200 cps)","Add borax + NaOH for crosslinking, cook 5 min more","Cool to 40 °C, add preservative","Fill","QC: Brookfield viscosity, pH 7.5–9, tack on Kraft paper, dry bond strength"],
      equipment:["Jacketed SS vessel with anchor agitator","Thermometer / thermocouple","Brookfield viscometer","pH meter","Tack tester"] },
    { id:"ad13", name:"Synthetic Rubber Contact Adhesive (Neoprene)", sub:"High tack, footwear, upholstery, laminates", score:86, tags:["rubber","contact","neoprene"],
      ingredients:[
        {n:"Polychloroprene CR solid",  p:20,  c:380},
        {n:"Toluene / Hexane 60:40",   p:55,  c:27},
        {n:"Zinc Oxide",               p:2,   c:90},
        {n:"MgO",                      p:1,   c:50},
        {n:"Phenolic Resin tackifier", p:8,   c:100},
        {n:"Antioxidant",              p:0.50,c:300},
        {n:"Accelerator ETU",          p:0.30,c:250},
      ],
      process:["EXPLOSION-PROOF facility mandatory (solvent flash point low)","Dissolve CR in toluene/hexane at 40–50 °C with anchor stirrer, 4–6 h (slow dissolution — do not rush)","Add ZnO + MgO slurry in part solvent","Add phenolic resin tackifier, stir 1 h","Add antioxidant + ETU accelerator last","Filter through 150µ and fill into tins/tubes","STORAGE: sealed tins, away from heat and spark sources","QC: quick-stick T-peel, 180° peel on leather / SBR rubber, viscosity, non-volatile content"],
      equipment:["Explosion-proof SS reactor with anchor stirrer","Ex-proof pump and filling line","Filter press","Peel/tack tester"] },
  ],

  cosmetics:[
    { id:"co1", name:"Glycerin Soap Bar (Transparent)", sub:"Hot process, vegetable oils, IS:4955", score:88, tags:["soap","glycerin"], free:true,
      ingredients:[
        {n:"Coconut Oil (76°)",  p:30,  c:120},
        {n:"Palm Oil (RBD)",     p:25,  c:90},
        {n:"Castor Oil",         p:10,  c:150},
        {n:"NaOH flakes",        p:9,   c:28},
        {n:"Water (for lye)",    p:5,   c:0.05},
        {n:"Glycerin",           p:12,  c:80},
        {n:"Ethanol 96%",        p:5,   c:55},
        {n:"Sugar Solution 70%", p:3,   c:25},
        {n:"Fragrance",          p:1,   c:800},
      ],
      process:["Heat oils (coconut + palm + castor) to 70 °C in SS reactor","Prepare NaOH lye: add NaOH to water slowly (NEVER water to NaOH) — CAUTION: exothermic, 80 °C spike, PPE mandatory","Add hot lye to hot oils with continuous stirring — mix to trace (saponification begins)","Heat batch at 90 °C, stir 60–90 min until full saponification (no unsaponified oil on pH test)","Add glycerin + ethanol + sugar solution at 80 °C — clarity develops","Add fragrance at 65 °C, mix 5 min","Pour into molds at 60–65 °C","Cool and cure 24–48 h, demold, cut","QC: pH 8.5–10, free alkali <0.1% (IS:4955), transparency, lather test"],
      equipment:["SS jacketed reactor with anchor agitator","pH meter","Thermometer","SS or silicone molds","Refractometer"] },
    { id:"co2", name:"SLS-Free Shampoo (Normal Hair)", sub:"Sarcosinate + CAPB, mild, IS:6012 compliant", score:87, tags:["shampoo","SLS-free","normal"], free:true,
      ingredients:[
        {n:"Water",                             p:57,  c:0.05},
        {n:"Sodium Lauroyl Sarcosinate 30%",    p:18,  c:180},
        {n:"CAPB 35%",                          p:8,   c:120},
        {n:"Decyl Glucoside 50%",               p:4,   c:180},
        {n:"Glycerin",                          p:2,   c:80},
        {n:"NaCl",                              p:1,   c:5},
        {n:"Citric Acid",                       p:0.30,c:60},
        {n:"Phenoxyethanol",                    p:0.50,c:400},
        {n:"Fragrance",                         p:0.80,c:800},
        {n:"Panthenol",                         p:0.50,c:500},
      ],
      process:["Heat water to 55 °C in SS tank with anchor agitator","Add sodium lauroyl sarcosinate — mix gently (avoid foam)","Add CAPB at 50 °C, mix 10 min","Add decyl glucoside at 50 °C, mix 5 min","Cool to 40 °C, add glycerin + NaCl (for viscosity building)","Adjust pH to 5.5–6.5 with citric acid","Add phenoxyethanol + panthenol at 35 °C, mix 10 min","Add fragrance at 30 °C, mix 5 min","Filter, fill","QC: pH 5.5–6.5, Brookfield viscosity 3000–8000 cps, foam height, clarity"],
      equipment:["SS tank with anchor agitator","Brookfield viscometer","pH meter","Foam tester"] },
    { id:"co3", name:"Baby Shampoo (No-Tear, Ultra-Mild)", sub:"Amphoteric surfactants only, pH 6–7", score:92, tags:["baby","shampoo","no-tear"], free:true,
      ingredients:[
        {n:"Water",                             p:70,  c:0.05},
        {n:"CAPB 35%",                          p:15,  c:120},
        {n:"Disodium Cocoamphodiacetate 40%",   p:6,   c:140},
        {n:"Glycerin",                          p:3,   c:80},
        {n:"Allantoin",                         p:0.20,c:500},
        {n:"NaCl",                              p:0.50,c:5},
        {n:"Citric Acid",                       p:0.20,c:60},
        {n:"Phenoxyethanol",                    p:0.50,c:400},
        {n:"Baby Fragrance (hypoallergenic)",   p:0.30,c:1500},
      ],
      process:["Heat water to 50 °C — use DM/purified water only","Add CAPB — mix gently at low speed to avoid foam","Add disodium cocoamphodiacetate, mix 10 min","Add glycerin + allantoin at 45 °C","Cool to 35 °C, add NaCl for viscosity","Adjust pH to 6.0–7.0 with citric acid (CRITICAL for zero irritation)","Add phenoxyethanol + baby fragrance at 30 °C","Fill","QC: pH 6.0–7.0 CRITICAL, Draize eye irritation = ZERO, viscosity 2000–5000 cps, microbial"],
      equipment:["SS tank gentle anchor agitator","pH meter (calibrate fresh)","Brookfield LV viscometer","Microbial testing"] },
    { id:"co4", name:"Moisturizer / Day Cream (O/W)", sub:"Niacinamide + HA, anti-aging, all skin types", score:91, tags:["moisturizer","cream","anti-aging"],
      ingredients:[
        {n:"Water (DM)",             p:65,  c:0.05},
        {n:"Cetearyl Alcohol",       p:3,   c:180},
        {n:"Glyceryl Stearate",      p:2,   c:200},
        {n:"Dimethicone 100 cst",    p:3,   c:350},
        {n:"CCT (caprylic/capric)",  p:4,   c:280},
        {n:"Glycerin",               p:5,   c:80},
        {n:"Niacinamide",            p:4,   c:900},
        {n:"Hyaluronic Acid 1% soln",p:3,   c:600},
        {n:"Carbopol 940",           p:0.30,c:500},
        {n:"TEA (Triethanolamine)",  p:0.25,c:80},
        {n:"Phenoxyethanol",         p:0.80,c:400},
        {n:"Fragrance",              p:0.30,c:800},
      ],
      process:["Water phase: heat DM water + glycerin + HA solution to 80 °C","Oil phase: melt cetearyl alcohol + glyceryl stearate + dimethicone + CCT at 80 °C in separate vessel","Homogenise: pour oil phase into water phase with high-shear homogenizer at 80 °C, 5 min","Cool to 45 °C with gentle mixing","Add niacinamide + pre-wetted Carbopol 940","Neutralise Carbopol with TEA dropwise to pH 5.5–6.5 (viscosity forms)","Add phenoxyethanol + fragrance at 35 °C","Degas, fill","QC: pH 5.5–6.5, viscosity, stability at 45 °C 6 weeks, microbial"],
      equipment:["Vacuum homogenizer emulsifier","Water bath + SS vessels","pH meter","Stability oven 45 °C","Brookfield viscometer"] },
    { id:"co5", name:"Aloe Vera Gel", sub:"After-sun, cooling, multipurpose soothing gel", score:90, tags:["aloe vera","gel"],
      ingredients:[
        {n:"Aloe Vera Juice (1x certified)",p:75,  c:50},
        {n:"DM Water",                      p:12,  c:0.05},
        {n:"Carbopol ETD 2020",             p:0.50,c:500},
        {n:"Glycerin",                      p:3,   c:80},
        {n:"TEA",                           p:0.40,c:80},
        {n:"Allantoin",                     p:0.20,c:500},
        {n:"Phenoxyethanol",                p:0.50,c:400},
        {n:"Panthenol",                     p:0.50,c:500},
        {n:"Cucumber Extract",              p:1,   c:400},
      ],
      process:["Sprinkle Carbopol ETD 2020 onto water + aloe vera juice — let swell 30 min without stirring","Add glycerin + allantoin + panthenol + cucumber extract — stir gently","Neutralise with TEA dropwise (gel forms rapidly) — target pH 6.0–7.0","Add phenoxyethanol at 35 °C","Fill","QC: clarity, pH 6–7, syneresis test (centrifuge), viscosity 15000–40000 cps"],
      equipment:["Paddle mixer (low shear)","pH meter","Centrifuge for syneresis","Brookfield viscometer"] },
    { id:"co6", name:"Toothpaste (Fluoride, Spearmint)", sub:"IS:6356, RDA compliant, fluoride 1000 ppm", score:90, tags:["toothpaste","fluoride","IS:6356"],
      ingredients:[
        {n:"Hydrated Silica (abrasive)",  p:20,  c:180},
        {n:"Glycerin 99%",               p:20,  c:80},
        {n:"Sorbitol 70% solution",      p:10,  c:55},
        {n:"DM Water",                   p:30,  c:0.05},
        {n:"CMC / Carrageenan binder",   p:1,   c:200},
        {n:"SLS 30% (foaming)",          p:1.5, c:60},
        {n:"Sodium Fluoride",            p:0.32,c:380},
        {n:"Sodium Saccharin",           p:0.20,c:300},
        {n:"Spearmint Flavour",          p:1,   c:1200},
        {n:"TiO2 (opacifier)",           p:0.50,c:200},
      ],
      process:["Pre-gel CMC/carrageenan in warm glycerin + sorbitol + water at 60 °C, 20 min — smooth gel","Cool to 40 °C, add hydrated silica in planetary mixer — mix 15 min at medium speed (avoid air entrainment)","Add SLS 30% solution, mix 10 min","Add NaF + saccharin + TiO2, mix 10 min","Add spearmint flavour last, mix 5 min","Fill into tubes under vacuum seal","QC: fluoride content by ISE electrode, pH 6.5–8.0, RDA abrasivity <250, viscosity, microbial"],
      equipment:["Planetary vacuum mixer","Tube filling + heat-seal machine","Ion selective electrode for F-","RDA abrasion test rig"] },
    { id:"co7", name:"Roll-On Deodorant (Aluminium-free)", sub:"Zinc ricinoleate based odour neutraliser", score:85, tags:["deodorant","roll-on"],
      ingredients:[
        {n:"DM Water",                       p:60,  c:0.05},
        {n:"Glycerin",                       p:5,   c:80},
        {n:"PEG-40 Hydrogenated Castor Oil", p:2,   c:200},
        {n:"Ethanol 96%",                    p:15,  c:55},
        {n:"Zinc Ricinoleate",               p:2,   c:350},
        {n:"Piroctone Olamine",              p:0.20,c:800},
        {n:"Fragrance",                      p:2,   c:800},
        {n:"Phenoxyethanol",                 p:0.50,c:400},
        {n:"HEC Thickener",                  p:0.50,c:200},
      ],
      process:["Dissolve HEC in DM water at 60 °C, swell 30 min","Cool to 40 °C, add glycerin + PEG-40 castor oil","Add ethanol slowly with gentle stirring (watch foam)","Add zinc ricinoleate + piroctone olamine, mix 10 min","Add fragrance + phenoxyethanol at 35 °C","Adjust pH to 4.5–6.0 with citric acid","Fill into roll-on bottles at 35 °C","QC: roll-on delivery rate, odour panel test, pH, microbial, stability"],
      equipment:["SS tank with anchor agitator","Roll-on bottle filler","pH meter","Odour panel","Stability chamber"] },
    { id:"co8", name:"Mouthwash (Antiseptic, Peppermint)", sub:"Alcohol-based, IS:9872, CPC + NaF", score:86, tags:["mouthwash","antiseptic"],
      ingredients:[
        {n:"DM Water",                   p:55,  c:0.05},
        {n:"Ethanol 96%",                p:15,  c:55},
        {n:"Glycerin",                   p:5,   c:80},
        {n:"Sorbitol 70%",               p:10,  c:55},
        {n:"Cetylpyridinium Chloride",   p:0.05,c:900},
        {n:"Polysorbate 80",             p:1,   c:180},
        {n:"Peppermint Oil",             p:0.30,c:1800},
        {n:"Sodium Fluoride",            p:0.05,c:380},
        {n:"Sodium Saccharin",           p:0.10,c:300},
        {n:"FD&C Blue + Green colour",   p:0.01,c:800},
      ],
      process:["Dissolve CPC + saccharin + NaF in DM water at 40 °C","Add glycerin + sorbitol, mix 10 min","Dissolve peppermint oil in polysorbate 80 + ethanol separately","Add oil-polysorbate-ethanol mixture slowly to aqueous phase with stirring","Add colour, check volume, fill","QC: CPC content by HPLC, fluoride by ISE, ethanol % by GC, microbial limit test, pH 5.5–7.0"],
      equipment:["SS tank","HPLC for CPC","Ion selective electrode F-","Gas chromatograph","Filling machine"] },
  ],

  homecare:[
    { id:"hc1", name:"Liquid Dishwash Concentrate (Lemon)", sub:"Grease-cutting, hand wash, IS:1613", score:84, tags:["dishwash","lemon"], free:true,
      ingredients:[
        {n:"Water",                p:52,  c:0.05},
        {n:"SLES 70%",             p:18,  c:90},
        {n:"CAPB 35%",             p:8,   c:120},
        {n:"LAS (neutralised)",    p:6,   c:40},
        {n:"NaCl",                 p:2,   c:5},
        {n:"Citric Acid",          p:0.50,c:60},
        {n:"Preservative",         p:0.30,c:350},
        {n:"Lemon Fragrance",      p:0.50,c:800},
      ],
      process:["Heat water to 50 °C","Neutralise LAS with NaOH 50% in separate vessel (exothermic — add NaOH to acid slowly, cool to <60 °C)","Add SLES 70% to main tank gently (avoid foam)","Add neutralised LAS + CAPB, mix 15 min","Cool to 40 °C, add NaCl for viscosity (Newtonian salt curve)","Adjust pH 6.5–7.5 with citric acid","Add preservative + fragrance + colour at 35 °C","QC: viscosity 1500–4000 cps, pH 6.5–7.5, actives content"],
      equipment:["SS tank with anchor agitator","Neutralisation vessel","pH meter","Brookfield viscometer"] },
    { id:"hc2", name:"Toilet Bowl Cleaner (HCl-based)", sub:"Viscous, limescale removal, IS:4955 type", score:88, tags:["toilet","HCl"], free:true,
      ingredients:[
        {n:"Water",                    p:75,  c:0.05},
        {n:"Hydrochloric Acid 32%",    p:12,  c:12},
        {n:"HEC (Natrosol)",           p:0.80,c:200},
        {n:"Nonionic Surfactant",      p:3,   c:80},
        {n:"Benzalkonium Chloride 50%",p:0.50,c:180},
        {n:"Blue Colour",              p:0.05,c:800},
        {n:"Floral Perfume",           p:0.30,c:800},
      ],
      process:["PPE MANDATORY: acid-resistant gloves, goggles, face shield, apron — HCl fumes are toxic","Dissolve HEC in DM water at 60 °C, stir 30 min — do NOT add acid yet","Cool to 30 °C — ALWAYS add acid to water, NEVER reverse","Add HCl 32% slowly with stirring (fumes — ventilate)","Add nonionic surfactant + BAC","Add colour + perfume at ambient","QC: pH <2, viscosity 1500–3000 cps (Brookfield LV spindle 3), active HCl content"],
      equipment:["Acid-resistant PP or FRP tank","Acid-proof PVDF pump","pH meter","Safety shower + eyewash station"] },
    { id:"hc3", name:"Floor Cleaner (Pine Phenyl)", sub:"White or pine phenyl concentrate, IS:14613", score:82, tags:["floor","phenyl"], free:true,
      ingredients:[
        {n:"Water",                      p:60,  c:0.05},
        {n:"Pine Oil / Terpineol",       p:10,  c:120},
        {n:"Castor Oil Soap (saponified)",p:8,  c:60},
        {n:"LAS (neutralised)",          p:6,   c:40},
        {n:"Sodium Xylene Sulphonate 40%",p:3,  c:50},
        {n:"Colour",                     p:0.05,c:800},
        {n:"Pine Fragrance",             p:0.50,c:800},
      ],
      process:["Prepare castor oil soap: saponify castor oil with NaOH at 80 °C until clear","Add LAS neutralised + SXS to warm water with stirring","Add pine oil / terpineol slowly with vigorous stirring (emulsification)","Add colour + fragrance","Fill into drums","Dilution: 1:10 to 1:20 with water for mopping","QC: emulsion stability (no separation 48 h), pine oil content, pH 9–11"],
      equipment:["SS tank","Emulsification mixer","Refractometer","pH meter"] },
    { id:"hc4", name:"Glass Cleaner (Streak-free, IPA)", sub:"Ammonia + IPA, spray bottle", score:86, tags:["glass","IPA"],
      ingredients:[
        {n:"DM Water",               p:72,  c:0.05},
        {n:"Isopropyl Alcohol 99%",  p:15,  c:55},
        {n:"Butyl Cellosolve",       p:3,   c:120},
        {n:"Ammonia 25%",            p:2,   c:20},
        {n:"Low-foam Nonionic EO5",  p:0.50,c:80},
        {n:"Blue Colour",            p:0.02,c:800},
        {n:"Light Floral Perfume",   p:0.20,c:800},
      ],
      process:["Mix IPA + butyl cellosolve + ammonia in fume hood first","Add DM water slowly with stirring","Add nonionic surfactant + colour + fragrance","Fill into trigger-spray bottles","QC: streak-free test on glass panel, pH 9.5–10.5, clarity, evaporation rate"],
      equipment:["Fume hood","Glass streak test panel","pH meter","Trigger-spray bottles"] },
    { id:"hc5", name:"Laundry Liquid Detergent (HE, Enzyme-boosted)", sub:"Low foam, front-load compatible", score:88, tags:["laundry","HE"],
      ingredients:[
        {n:"Water",                      p:45,  c:0.05},
        {n:"LAS (neutralised)",          p:12,  c:40},
        {n:"Nonionic C12-14 EO7",        p:8,   c:90},
        {n:"Sodium Citrate",             p:3,   c:45},
        {n:"Sodium Bicarbonate",         p:2,   c:12},
        {n:"Glycerin",                   p:2,   c:80},
        {n:"Protease Enzyme",            p:0.50,c:700},
        {n:"Optical Brightener CBS-X",   p:0.20,c:500},
        {n:"Fragrance",                  p:0.80,c:800},
        {n:"Phenoxyethanol",             p:0.30,c:400},
      ],
      process:["Dissolve sodium citrate + bicarbonate in water at 50 °C","Cool to 40 °C, add LAS (neutralised) + nonionic surfactant","Add glycerin + optical brightener, mix 10 min","Add protease enzyme at 35 °C (temperature critical — enzyme denatures >40 °C)","Add fragrance + phenoxyethanol at 30 °C","Adjust pH 7.5–9.0","Fill","QC: standard stain wash test ASTM D4265, enzyme activity, pH, suds control"],
      equipment:["SS tank","Washing machine test rig","Stain removal test kit","Enzyme activity assay","pH meter"] },
  ],

  inks:[
    { id:"ik1", name:"Flexographic Ink — Process Cyan (Water-based)", sub:"Water-based, LDPE / paper", score:88, tags:["flexo","water-based","cyan"], free:true,
      ingredients:[
        {n:"Pigment Blue 15:3 (Cyan)",  p:8,   c:900},
        {n:"Styrene Acrylic Emulsion 40%",p:35, c:110},
        {n:"Water",                     p:45,  c:0.10},
        {n:"Isopropanol",               p:5,   c:55},
        {n:"Wax Emulsion",              p:2,   c:120},
        {n:"Dispersant",                p:1,   c:200},
        {n:"Defoamer",                  p:0.30,c:200},
        {n:"Ammonia (pH adjustment)",   p:0.20,c:20},
      ],
      process:"Water-based flexo ink manufactured by pre-dispersing pigment with dispersant in water using a bead mill (D50 <1 µm target), then let-down with styrene acrylic emulsion. IPA improves substrate wetting and drying. pH adjusted to 8-9 with ammonia. Contact us for Process Flow Diagram.",
      equipment:["Bead mill (horizontal)","Particle size analyser","Viscosity cup (Zahn #2)","pH meter"] },
    { id:"ik2", name:"Gravure Ink — Black (Toluene-based)", sub:"High speed rotogravure, publication", score:90, tags:["gravure","solvent","black"], free:true,
      ingredients:[
        {n:"Carbon Black",              p:12,  c:130},
        {n:"Toluene",                   p:50,  c:25},
        {n:"Polyamide Resin",           p:25,  c:220},
        {n:"Nitrocellulose 1/4 sec",    p:8,   c:280},
        {n:"Isopropanol",               p:3,   c:55},
        {n:"Plasticiser (DOP)",         p:1.5, c:55},
        {n:"Wax",                       p:0.50,c:150},
      ],
      process:"Solvent-based gravure ink. Carbon black pre-dispersed in part toluene + polyamide using bead mill to D50 <0.5 µm. NC resin dissolved separately in toluene/IPA blend. Combined at let-down. Contact us for Process Flow Diagram. Note: Ex-proof facility required.",
      equipment:["Bead mill (ex-proof)","Rotary viscometer","Particle size analyser","Ex-proof mixing tank"] },
    { id:"ik3", name:"Offset Lithographic Ink — Black", sub:"Heatset / coldset, mineral oil vehicle", score:87, tags:["offset","lithographic","black"],
      ingredients:[
        {n:"Carbon Black (furnace)",    p:18,  c:130},
        {n:"Mineral Oil (Heatset)",     p:30,  c:22},
        {n:"Alkyd Varnish (6P bodied)", p:30,  c:95},
        {n:"Rosin Modified Phenolic Resin",p:15,c:180},
        {n:"Co/Mn Drier",              p:1,   c:300},
        {n:"PTFE/Wax Compound",        p:2,   c:200},
        {n:"Anti-skinning Agent MEKO", p:0.30,c:300},
      ],
      process:"Offset ink is a high-viscosity paste system. Carbon black is milled with varnish in a 3-roll mill to achieve tack and fineness. The process requires multiple mill passes. Rheology (tack, flow) is critical. Contact us for Process Flow Diagram.",
      equipment:["3-roll mill","Inkometer (tack)","Laray viscometer","Fineness of grind gauge"] },
    { id:"ik4", name:"UV Offset Ink — Process Cyan", sub:"UV curable, sheetfed offset", score:94, tags:["UV","offset","curable"],
      ingredients:[
        {n:"Pigment Blue 15:3",         p:12,  c:900},
        {n:"Epoxy Acrylate Oligomer",   p:30,  c:350},
        {n:"TPGDA Reactive Diluent",    p:20,  c:150},
        {n:"HDDA Reactive Diluent",     p:10,  c:140},
        {n:"Irgacure 819 Photoinitiator",p:4,  c:1200},
        {n:"Benzophenone",              p:3,   c:120},
        {n:"Wax",                       p:1.50,c:200},
        {n:"Flow Additive",             p:0.50,c:400},
      ],
      process:"UV-curable offset ink manufactured under yellow/filtered light to prevent premature cure. Pigment dispersed in oligomer using 3-roll mill to D50 <1 µm. UV cure with mercury or LED lamps. Contact us for Process Flow Diagram.",
      equipment:["3-roll mill (dark room)","UV LED/mercury cure unit","Tack meter","Fineness gauge"] },
    { id:"ik5", name:"Screen Printing Ink — White (Plastisol)", sub:"PVC plastisol, textile screen printing", score:91, tags:["screen","plastisol","textile"],
      ingredients:[
        {n:"PVC Resin (Paste grade K=70)",p:30, c:85},
        {n:"DOP Plasticiser",            p:40,  c:55},
        {n:"TiO2 Rutile",               p:20,  c:360},
        {n:"Thermal Stabiliser (Ca/Zn)", p:1,   c:250},
        {n:"Gelling Agent",             p:1,   c:200},
        {n:"Rheology Modifier",         p:0.50,c:180},
      ],
      process:"PVC plastisol ink — PVC resin wetted out in DOP plasticiser under low shear to form a paste. TiO2 dispersed in part plastisol using 3-roll mill. Combined and de-aired. Cures at 150–170 °C on textile. Contact us for Process Flow Diagram.",
      equipment:["3-roll mill","Viscometer","Curing oven / flash cure","Wash fastness tester"] },
    { id:"ik6", name:"Inkjet Ink — Pigmented Black (Water-based)", sub:"Desktop / wide format, pigment encapsulated", score:93, tags:["inkjet","pigmented","water-based"],
      ingredients:[
        {n:"Carbon Black (encapsulated dispersion 15%)",p:20,c:400},
        {n:"Water (DI)",                p:60,  c:0.10},
        {n:"Humectant (Glycerol)",      p:10,  c:80},
        {n:"Co-solvent (1,2-Propanediol)",p:6,  c:65},
        {n:"Surfactant (Surfynol 465)", p:0.50,c:500},
        {n:"Biocide (Proxel)",          p:0.20,c:800},
      ],
      process:"Pigmented inkjet ink requires encapsulated pigment dispersion (particle size D99 <200 nm — critical for nozzle reliability). Formulation is a simple blend but requires sub-micron filtration (0.5 µm) before fill. Contact us for Process Flow Diagram.",
      equipment:["Sub-micron bead mill","0.5 µm membrane filter","Particle size analyser (DLS)","Surface tension meter"] },
  ],

  sizing:[
    { id:"sz1", name:"Warp Sizing Agent — PVA / Starch Blend", sub:"Textile warp sizing, weaving efficiency", score:86, tags:["textile","warp sizing","PVA"], free:true,
      ingredients:[
        {n:"Modified Corn Starch (oxidised)",p:30, c:22},
        {n:"PVAc Emulsion 55%",             p:20,  c:60},
        {n:"Water (process)",               p:44,  c:0.10},
        {n:"Softener (Acrylic PAM)",        p:2,   c:90},
        {n:"Wax Emulsion",                  p:1.50,c:80},
        {n:"Preservative",                  p:0.10,c:350},
        {n:"Lubricant (mineral oil emulsion)",p:1.50,c:40},
      ],
      process:"Warp sizing agent prepared by cooking oxidised starch at 90 °C for 30 min to full gelatinisation, then cooling to 60 °C before adding PVAc emulsion, softener and lubricants. Applied on sizing machine at 85–90 °C onto warp beam. Contact us for Process Flow Diagram.",
      equipment:["Jacketed cooking vessel with anchor agitator","Sizing machine","Add-on % measurement","Abrasion tester"] },
    { id:"sz2", name:"Warp Sizing — Pure PVA Film Former", sub:"High tenacity yarn, filament sizing", score:90, tags:["textile","warp sizing","PVA film"], free:true,
      ingredients:[
        {n:"PVA (fully hydrolysed, Mw 125000)",p:10, c:160},
        {n:"Water (DM)",                       p:85, c:0.10},
        {n:"Lubricant (PE wax emulsion)",      p:2,  c:80},
        {n:"Softener",                         p:1.50,c:90},
        {n:"Antistatic Agent",                 p:0.50,c:180},
      ],
      process:"PVA solution prepared by dissolving in hot water (90 °C, 60 min) with stirring. Additions of lubricant and antistatic at 60 °C. Applied hot at 4–8% add-on. Contact us for Process Flow Diagram.",
      equipment:["SS dissolution tank with high-shear agitator","Sizing machine","Viscosity cup","Add-on % tester"] },
    { id:"sz3", name:"Paper Surface Sizing — Oxidised Starch", sub:"Surface sizing press, paper / board", score:83, tags:["paper","surface sizing","starch"], free:true,
      ingredients:[
        {n:"Oxidised Corn / Tapioca Starch",   p:8,  c:22},
        {n:"Water (process)",                  p:91, c:0.10},
        {n:"Optical Brightener (stilbene type)",p:0.20,c:500},
        {n:"Biocide",                          p:0.05,c:350},
      ],
      process:"Starch cooked at 4–8% concentration in jacketed vessel at 95 °C for 20–30 min. Optical brightener and biocide added after cooking and cooling to 60 °C. Applied at size press at 50–60 °C. Contact us for Process Flow Diagram.",
      equipment:["Jacketed cooking vessel","Size press (puddle or metered)","Cobb tester","Viscometer"] },
    { id:"sz4", name:"Paper Internal Sizing — AKD (Alkyl Ketene Dimer)", sub:"Neutral / alkaline sizing for offset paper", score:91, tags:["paper","internal sizing","AKD"],
      ingredients:[
        {n:"AKD Emulsion (14% active)",        p:0.20,c:400},
        {n:"Cationic Starch (retention aid)",  p:0.50,c:120},
        {n:"Water (process — added at wet end)",p:99.30,c:0.10},
      ],
      process:"AKD is added to the paper machine wet end at low dosage (0.05–0.2% on fibre). Cationic starch as retention aid fixes AKD to fibres. AKD reacts with cellulose during drying/calendering to form covalent ester bond. Contact us for dosage optimisation and Process Flow Diagram.",
      equipment:["Dosing pump (wet end)","Cobb tester","HST sizing tester","Zeta potential meter"] },
    { id:"sz5", name:"Paper Internal Sizing — ASA (Alkenyl Succinic Anhydride)", sub:"High speed sizing, neutral pH", score:92, tags:["paper","internal sizing","ASA"],
      ingredients:[
        {n:"ASA Emulsion (freshly prepared, 10% active)",p:0.30,c:350},
        {n:"Cationic Starch",                           p:0.50,c:120},
        {n:"Water (wet end make-up)",                   p:99.20,c:0.10},
      ],
      process:"ASA must be emulsified fresh immediately before addition to the paper machine (30 min shelf life maximum). Emulsified using cationic starch in high-shear emulsifier inline. More reactive than AKD — faster sizing development. Contact us for dosage and process guidance.",
      equipment:["Inline ASA emulsifier","Dosing pump","Cobb tester","HST tester"] },
    { id:"sz6", name:"Textile Finish — Softener (Cationic)", sub:"After-treatment, fabric softness and drape", score:87, tags:["textile","softener","cationic"],
      ingredients:[
        {n:"Distearyldimethyl Ammonium Chloride 75%",p:8,c:180},
        {n:"Cetyl Alcohol",                          p:2,c:180},
        {n:"Water (DM)",                             p:87,c:0.10},
        {n:"Acetic Acid (pH adjustment)",            p:0.50,c:60},
        {n:"Silicone Emulsion (amino-functional)",   p:2,c:400},
        {n:"Preservative",                           p:0.20,c:350},
      ],
      process:"Cationic softener emulsion prepared by melting DSDMAC + cetyl alcohol at 70 °C, then emulsifying into hot water under high shear. Silicone emulsion added after cooling to 40 °C. pH adjusted to 4.5–5.5 with acetic acid. Applied by exhaust or pad process. Contact us for Process Flow Diagram.",
      equipment:["Jacketed homogeniser","pH meter","Conditioning evaluation","Hand evaluation panel"] },
    { id:"sz7", name:"Textile Sizing — CMC / MHEC Blend", sub:"Synthetic sizing, polyester / cotton blends", score:85, tags:["textile","CMC","MHEC","sizing"],
      ingredients:[
        {n:"CMC (DS 0.7, medium viscosity)",  p:5,  c:90},
        {n:"MHEC (viscosity 15000 cps)",      p:2,  c:275},
        {n:"Water (DM)",                      p:88, c:0.10},
        {n:"Lubricant (Tallow / PE wax)",     p:2,  c:50},
        {n:"Antistatic Agent",               p:0.50,c:180},
        {n:"Preservative",                    p:0.10,c:350},
      ],
      process:"CMC and MHEC dissolved sequentially in hot water (80 °C) to form a stable viscous solution. Lubricant and antistatic added at 60 °C. Applied on sizing machine. Offers excellent film formation with easy desizing (water soluble). Contact us for Process Flow Diagram.",
      equipment:["SS dissolution tank","Sizing machine","Viscometer","Film strength tester"] },
  ],

  pharma:PHARMA_DATA,

  agro:[
    { id:"ag1", name:"Carbofuran 3% CG (Carbofuran Granules)", sub:"Carbamate insecticide — soil application for root insects", score:82, tags:["insecticide","granules","carbamate"], free:true,
      ingredients:[
        {n:"Carbofuran Technical (98% purity)", p:3.06, c:1200},
        {n:"Attapulgite Clay (carrier)",        p:85,   c:18},
        {n:"White Carbon Black (flow agent)",   p:2,    c:180},
        {n:"Calcium Stearate (lubricant)",      p:0.50, c:120},
        {n:"Silica Sand (filler)",              p:9.44, c:8},
      ],
      process:"Carbofuran 3% CG manufactured by mixing technical grade carbofuran with attapulgite clay carrier in ribbon blender. Granule size 0.3–1.5mm. Critical: carbofuran is highly toxic (WHO Class Ib) — full PPE mandatory. Restricted/banned in many countries — verify local regulations before manufacture. Contact us for Process Flow Diagram and regulatory compliance details.",
      equipment:["Ribbon blender SS","Granulator","Rotary dryer","Sieve 0.3-1.5mm","PPE mandatory — full body suit","Dust extraction system"] },

    { id:"ag2", name:"Cartap Hydrochloride 4% GR", sub:"Nereistoxin insecticide — rice stem borer, leaf folder", score:83, tags:["insecticide","granules","rice pest"], free:true,
      ingredients:[
        {n:"Cartap Hydrochloride Technical (95%)", p:4.21, c:850},
        {n:"Attapulgite Clay",                    p:80,   c:18},
        {n:"Kaolin Clay",                         p:10,   c:15},
        {n:"Polyvinyl Alcohol (binder)",          p:1,    c:180},
        {n:"Talc (anti-caking)",                  p:4.79, c:22},
      ],
      process:"Cartap HCl granules prepared by mixing active ingredient with clay carriers. Used for broadcast application in paddy fields for stem borer and leaf folder control. Granule size 0.6–1.2mm. Dust-free formulation reduces applicator exposure. Contact us for PFD and regulatory data.",
      equipment:["Ribbon blender","Granulator","Rotary sieve","Dust extraction","Moisture analyser"] },

    { id:"ag3", name:"Chlorantraniliprole 18.5% SC", sub:"Diamide insecticide — lepidopteran pests, suspension concentrate", score:91, tags:["insecticide","SC","diamide","lepidoptera"],
      ingredients:[
        {n:"Chlorantraniliprole Technical (96%)", p:19.27, c:4500},
        {n:"Polyvinyl Pyrrolidone (dispersant)",  p:2,     c:350},
        {n:"Sodium Lignosulfonate (dispersant)",  p:1.5,   c:85},
        {n:"Propylene Glycol (antifreeze)",        p:3,     c:120},
        {n:"Xanthan Gum (suspending agent)",      p:0.3,   c:450},
        {n:"Silicone Antifoam",                   p:0.2,   c:280},
        {n:"Water (deionised)",                   p:73.73, c:2},
      ],
      process:"SC formulation requires high-speed bead milling to achieve particle size D90 <5 microns. Wettability, suspensibility and flowability per FAO/WHO specifications. Stability testing at 0°C and 54°C mandatory. Contact us for PFD and FAO specification compliance.",
      equipment:["Bead mill (horizontal)","High-speed disperser","Particle size analyser","Viscometer","Stability chambers 0°C and 54°C"] },

    { id:"ag4", name:"Chlorpyrifos 20% EC", sub:"Organophosphate insecticide — broad spectrum, emulsifiable concentrate", score:79, tags:["insecticide","EC","organophosphate"],
      ingredients:[
        {n:"Chlorpyrifos Technical (98.5%)",      p:20.30, c:280},
        {n:"Xylene (aromatic solvent)",           p:60,    c:85},
        {n:"Alkyl Benzene Sulfonate (emulsifier)",p:8,     c:120},
        {n:"Calcium Dodecylbenzene Sulfonate",    p:4,     c:95},
        {n:"Cyclohexanone (co-solvent)",          p:7.70,  c:95},
      ],
      process:"EC formulation by dissolving chlorpyrifos technical in xylene/cyclohexanone blend, then adding emulsifier system. Emulsification stability test: 0–2 ml cream/sediment after 1h at 30°C. Flash point >23°C mandatory for safety classification. NOTE: Chlorpyrifos is banned/restricted in EU, USA, and several other countries — verify local regulations. Contact us for PFD.",
      equipment:["Stainless steel mixing vessel","High-speed stirrer","Emulsification tester","Flame-proof electrical fittings","Solvent recovery system"] },

    { id:"ag5", name:"Cypermethrin 10% EC", sub:"Pyrethroid insecticide — broad spectrum, cotton, vegetables", score:85, tags:["insecticide","EC","pyrethroid"],
      ingredients:[
        {n:"Cypermethrin Technical 93% (cis:trans 40:60)", p:10.75, c:380},
        {n:"Aromatic Solvent 150",                         p:72,    c:62},
        {n:"Castor Oil Ethoxylate (emulsifier)",           p:7,     c:150},
        {n:"Calcium Dodecylbenzene Sulfonate",             p:5,     c:95},
        {n:"Cyclohexanone",                                p:5.25,  c:95},
      ],
      process:"Dissolve cypermethrin technical in aromatic solvent + cyclohexanone. Add emulsifier blend and mix thoroughly. Emulsification stability, pH (4–7), and cold storage test at 0°C for 7 days required. Flash point classification mandatory. Contact us for PFD and export specification compliance.",
      equipment:["SS mixing vessel","High-speed stirrer","Emulsification tester","Cold storage 0°C","pH meter"] },

    { id:"ag6", name:"Deltamethrin 2.5% EC", sub:"Type II pyrethroid — cotton bollworm, stored grain pests", score:87, tags:["insecticide","EC","pyrethroid","stored grain"],
      ingredients:[
        {n:"Deltamethrin Technical (98%)",         p:2.55,  c:1800},
        {n:"Aromatic Solvent 200",                 p:80,    c:68},
        {n:"Castor Oil Ethoxylate 40 EO",          p:8,     c:165},
        {n:"Calcium Dodecylbenzene Sulfonate",     p:5,     c:95},
        {n:"Cyclohexanone",                        p:4.45,  c:95},
      ],
      process:"Deltamethrin is a highly active pyrethroid — accurate weighing critical. Dissolve in aromatic solvent 200 (higher flash point than S150). Emulsification stability, density, and flash point testing mandatory. Contact us for PFD and WHO specification compliance.",
      equipment:["SS mixing vessel","Analytical balance 0.01g","High-speed stirrer","Emulsification tester","Flash point tester"] },

    { id:"ag7", name:"Emamectin Benzoate 5% SG", sub:"Avermectin insecticide — diamondback moth, fall armyworm, soluble granules", score:88, tags:["insecticide","SG","avermectin"],
      ingredients:[
        {n:"Emamectin Benzoate Technical (95%)", p:5.26,  c:8500},
        {n:"Ammonium Sulfate (carrier/filler)",  p:70,    c:22},
        {n:"Sodium Lauryl Sulfate (wetting)",    p:2,     c:180},
        {n:"Urea (humectant/solubiliser)",       p:15,    c:28},
        {n:"Silica (anti-caking)",               p:7.74,  c:45},
      ],
      process:"Soluble granule (SG) formulation — dissolves completely in water. Mix emamectin benzoate with ammonium sulfate carrier. Granulation by dry compaction. Complete solubility test (no residue) at 20°C mandatory. Contact us for PFD and FAO specification data.",
      equipment:["Ribbon blender","Dry compactor/granulator","Dissolution tester","Sieve analysis","Moisture analyser"] },

    { id:"ag8", name:"Ethion 50% EC", sub:"Organophosphate acaricide/insecticide — spider mites, thrips", score:78, tags:["insecticide","EC","organophosphate","acaricide"],
      ingredients:[
        {n:"Ethion Technical (95%)",               p:52.63, c:320},
        {n:"Xylene",                               p:35,    c:85},
        {n:"Alkyl Benzene Sulfonate (emulsifier)", p:8,     c:120},
        {n:"Calcium Dodecylbenzene Sulfonate",     p:4.37,  c:95},
      ],
      process:"High-load EC formulation. Ethion technical dissolved in xylene at room temperature with good agitation. Emulsifier blend added last. High concentration demands precise emulsification system — test at 30°C and 15°C. Contact us for PFD.",
      equipment:["SS mixing vessel","High-speed stirrer","Emulsification tester","Cold stability test 0°C","Density meter"] },

    { id:"ag9", name:"Fipronil 0.3% GR", sub:"Phenylpyrazole insecticide — termite, soil pests, rice hoppers", score:84, tags:["insecticide","granules","phenylpyrazole","termite"],
      ingredients:[
        {n:"Fipronil Technical (95%)",    p:0.316, c:3500},
        {n:"Attapulgite Clay",            p:85,    c:18},
        {n:"Silica Sand",                 p:12,    c:8},
        {n:"Polyvinyl Alcohol (binder)",  p:1,     c:180},
        {n:"Talc",                        p:1.684, c:22},
      ],
      process:"Very low active ingredient (0.3%) requires precise weighing and thorough mixing. Fipronil dissolved in small amount of acetone, mixed with clay carrier in planetary mixer, dried. Granule uniformity testing critical. Contact us for PFD and regulatory compliance.",
      equipment:["Planetary mixer","Rotary dryer","Sieve 0.3-1.5mm","Analytical balance 0.001g","Acetone recovery system"] },

    { id:"ag10", name:"Glyphosate 41% SL (Isopropylamine Salt)", sub:"Non-selective systemic herbicide — broadleaf and grass weeds", score:88, tags:["herbicide","SL","non-selective","glyphosate"],
      ingredients:[
        {n:"Glyphosate IPA Salt (71.2% acid equivalent)", p:57.58, c:185},
        {n:"POEA Surfactant (ethoxylated tallowamine)",   p:15,    c:220},
        {n:"Sodium Polyacrylate (anti-settling)",         p:0.5,   c:280},
        {n:"Water (deionised)",                           p:26.92, c:2},
      ],
      process:"Glyphosate 41% SL prepared by dissolving IPA salt in water, adding POEA surfactant. pH 4.5–5.0 critical for stability. POEA surfactant regulated in EU — verify local requirements. Density ~1.17 g/ml. Contact us for PFD and global registration data.",
      equipment:["SS mixing vessel","pH meter","Density meter","Viscometer","Stability chamber 54°C"] },

    { id:"ag11", name:"Imidacloprid 17.8% SL", sub:"Neonicotinoid systemic insecticide — sucking pests, seed treatment", score:89, tags:["insecticide","SL","neonicotinoid","systemic"],
      ingredients:[
        {n:"Imidacloprid Technical (97%)",          p:18.35, c:650},
        {n:"N-Methyl Pyrrolidone (solvent/co-solv)",p:25,    c:180},
        {n:"Dimethyl Sulfoxide (co-solvent)",       p:10,    c:120},
        {n:"Polyoxyethylene Sorbitan Monooleate",   p:3,     c:280},
        {n:"Water (deionised)",                     p:43.65, c:2},
      ],
      process:"Imidacloprid SL — dissolve technical in NMP/DMSO co-solvent blend first, then dilute with water and add surfactant. Clear, homogeneous solution. pH 5–7. Cold stability (-5°C, 7 days) and heat stability (54°C, 14 days) testing mandatory. Contact us for PFD.",
      equipment:["SS mixing vessel","pH meter","Cold stability chamber -5°C","Heat stability 54°C","Particle size analyser"] },

    { id:"ag12", name:"Indoxacarb 14.5% SC", sub:"Oxadiazine insecticide — cotton bollworm, beet armyworm", score:86, tags:["insecticide","SC","oxadiazine","lepidoptera"],
      ingredients:[
        {n:"Indoxacarb Technical (95%)",           p:15.26, c:2800},
        {n:"Polyoxyethylene Castor Oil (dispersant)",p:3,   c:220},
        {n:"Sodium Lignosulfonate",                p:2,     c:85},
        {n:"Propylene Glycol",                     p:5,     c:120},
        {n:"Xanthan Gum",                          p:0.3,   c:450},
        {n:"Silicone Antifoam",                    p:0.2,   c:280},
        {n:"Water (deionised)",                    p:74.24, c:2},
      ],
      process:"SC formulation using bead mill to achieve particle size D90 <5 microns. Wet milling with dispersant system. Suspensibility >90% at 30 min mandatory. Accelerated stability at 54°C and 0°C for 14 days. Contact us for PFD and FAO specification compliance.",
      equipment:["Bead mill","High-speed disperser","Particle size analyser","Viscometer","Stability chambers"] },

    { id:"ag13", name:"Lambda-Cyhalothrin 5% EC", sub:"Type II pyrethroid — wide spectrum, cotton, cereals, vegetables", score:86, tags:["insecticide","EC","pyrethroid","lambda"],
      ingredients:[
        {n:"Lambda-Cyhalothrin Technical (96%)", p:5.21,  c:1200},
        {n:"Aromatic Solvent 150",               p:74,    c:62},
        {n:"Castor Oil Ethoxylate (emulsifier)", p:10,    c:165},
        {n:"Calcium Alkyl Benzene Sulfonate",    p:6,     c:95},
        {n:"Cyclohexanone (co-solvent)",         p:4.79,  c:95},
      ],
      process:"Lambda-cyhalothrin EC with good emulsification stability. Dissolve in aromatic solvent/cyclohexanone, add emulsifier. Emulsification, cold storage stability (-10°C), and flash point testing. Contact us for PFD.",
      equipment:["SS mixing vessel","High-speed stirrer","Emulsification tester","Flash point tester","Cold stability -10°C"] },

    { id:"ag14", name:"Mancozeb 75% WP", sub:"Dithiocarbamate fungicide — broad spectrum, wettable powder", score:84, tags:["fungicide","WP","dithiocarbamate"],
      ingredients:[
        {n:"Mancozeb Technical (85%)",            p:88.24, c:120},
        {n:"Sodium Lignosulfonate (dispersant)",   p:4,     c:85},
        {n:"Sodium Lauryl Sulfate (wetting agent)",p:2,     c:180},
        {n:"White Carbon Black (carrier)",         p:3,     c:180},
        {n:"Kaolin Clay (filler)",                 p:2.76,  c:15},
      ],
      process:"Mancozeb 75% WP prepared by dry blending/ball milling to achieve particle size 95% <44 microns. Wettability <1 minute (CIPAC method). Suspensibility >60% at 30 min. Moisture content <2%. Dust explosion risk — dust extraction mandatory. Contact us for PFD.",
      equipment:["Ball mill / pin mill","Air classifier","Wettability tester","Sieve 44 micron","Dust extraction system","Moisture analyser"] },

    { id:"ag15", name:"Neem Oil Azadirachtin 0.15% EC (1500 ppm)", sub:"Botanical insecticide/nematicide — organic, safe, broad spectrum", score:90, tags:["insecticide","botanical","organic","neem"],
      ingredients:[
        {n:"Neem Oil (cold pressed, 3000 ppm AZA)", p:5,    c:280},
        {n:"Azadirachtin Technical (5% conc.)",     p:0.3,  c:4500},
        {n:"Castor Oil Ethoxylate (emulsifier)",    p:10,   c:165},
        {n:"Polyoxyethylene Sorbitan Monooleate",   p:5,    c:280},
        {n:"Isopropyl Alcohol (co-solvent)",        p:5,    c:85},
        {n:"Water (deionised)",                     p:74.7, c:2},
      ],
      process:"Neem-based EC — azadirachtin is light and heat sensitive. Formulate at <30°C, store in dark. Emulsification stability and azadirachtin content by HPLC (UV 215nm) mandatory. Organic certification compliant. Contact us for PFD.",
      equipment:["SS mixing vessel (jacketed)","Low-shear mixer","HPLC for azadirachtin assay","Cold storage","Dark packaging"] },

    { id:"ag16", name:"Sulfur 80% WDG (Water Dispersible Granules)", sub:"Multi-site fungicide/acaricide — powdery mildew, spider mites", score:87, tags:["fungicide","acaricide","WDG","sulfur"],
      ingredients:[
        {n:"Sulfur Technical (99.5%)",             p:80,   c:35},
        {n:"Sodium Lignosulfonate (dispersant)",   p:5,    c:85},
        {n:"Sodium Lauryl Sulfate (wetting agent)",p:3,    c:180},
        {n:"Polyvinyl Pyrrolidone (binder)",       p:2,    c:350},
        {n:"Kaolin Clay (carrier/filler)",         p:10,   c:15},
      ],
      process:"Sulfur 80% WDG by wet milling sulfur with dispersant system to D90 <10 microns, then fluid bed drying/granulation. Dispersibility >90% and wettability <1 min critical. Sulfur dust is flammable — explosion-proof equipment mandatory. Contact us for PFD.",
      equipment:["Wet bead mill","Fluid bed granulator/dryer","Dispersibility tester","Explosion-proof fittings","Particle size analyser"] },

    { id:"ag17", name:"Thiamethoxam 25% WG", sub:"Second-generation neonicotinoid — aphids, whitefly, thrips, seed treatment", score:90, tags:["insecticide","WG","neonicotinoid","seed treatment"],
      ingredients:[
        {n:"Thiamethoxam Technical (97%)",         p:25.77, c:750},
        {n:"Ammonium Sulfate (carrier)",           p:55,    c:22},
        {n:"Sodium Lignosulfonate (dispersant)",   p:5,     c:85},
        {n:"Sodium Lauryl Sulfate (wetting agent)",p:3,     c:180},
        {n:"Polyvinyl Pyrrolidone (binder)",       p:2,     c:350},
        {n:"Silica (flow agent)",                  p:9.23,  c:45},
      ],
      process:"Thiamethoxam 25% WG — water dispersible granules by dry compaction or extrusion-spheronisation. Complete dispersibility in water. Suspensibility >75% at 30 min. Accelerated stability 54°C 14 days. Contact us for PFD and seed treatment application guidelines.",
      equipment:["Dry compactor / extruder","Spheroniser","Dissolution/dispersibility tester","Sieve analysis","Stability chamber 54°C"] },

    { id:"ag18", name:"Triacontanol 0.1% EC (TRIA Growth Promoter)", sub:"Plant growth regulator — photosynthesis enhancer, yield booster", score:85, tags:["PGR","growth promoter","EC","organic"],
      ingredients:[
        {n:"Triacontanol Technical (95%)",          p:0.105, c:2800},
        {n:"Groundnut Oil (carrier/solvent)",       p:40,    c:120},
        {n:"Castor Oil Ethoxylate 40EO (emulsifier)",p:10,   c:165},
        {n:"Polyoxyethylene Sorbitan Monooleate",   p:5,     c:280},
        {n:"Isopropyl Alcohol",                     p:10,    c:85},
        {n:"Water (deionised)",                     p:34.895,c:2},
      ],
      process:"Triacontanol is a long-chain fatty alcohol with very low water solubility — requires careful emulsification. Dissolve in oil+IPA first, then emulsify with hot water (50°C). Emulsification stability critical. HPLC assay for triacontanol content. Contact us for PFD and crop application schedule.",
      equipment:["Jacketed mixing vessel","High-shear homogeniser","HPLC for assay","Emulsification tester","Hot water supply 50°C"] },
  ],
  fragrance:[
    { id:"fr1", name:"Classic Musk Accord", sub:"Warm, sensual base note blend", score:88, tags:["musk","base note","oriental"], free:true,
      ingredients:[
        {n:"Galaxolide 50% IPM",          p:25,  c:850},
        {n:"Habanolide (Exaltolide)",      p:15,  c:1200},
        {n:"Iso E Super",                  p:20,  c:600},
        {n:"Cashmeran",                    p:10,  c:950},
        {n:"Ethylene Brassylate",          p:15,  c:700},
        {n:"Dipropylene Glycol (DPG)",     p:15,  c:120},
      ],
      process:"Musk accord blended by dissolving all aromatic ingredients in DPG at room temperature with gentle stirring for 30 min. Allow to mature 24–48 h before use. Contact us for detailed application guidelines and Process Flow Diagram.",
      equipment:["Stainless steel blending vessel","Magnetic stirrer","Analytical balance 0.001g","GC-MS for quality check"] },
    { id:"fr2", name:"Rose Absolute Accord", sub:"Floral heart note, Bulgarian rose character", score:91, tags:["rose","floral","heart note"], free:true,
      ingredients:[
        {n:"Rose Oxide",                   p:0.50,c:4500},
        {n:"Geraniol",                     p:20,  c:800},
        {n:"Citronellol",                  p:25,  c:650},
        {n:"Phenyl Ethyl Alcohol",         p:30,  c:400},
        {n:"Eugenol",                      p:5,   c:350},
        {n:"Linalool",                     p:10,  c:500},
        {n:"Nerol",                        p:5,   c:750},
        {n:"Benzyl Alcohol",               p:5,   c:180},
      ],
      process:"Rose accord is built by careful weighing of all components in order of decreasing volatility. Rose oxide at 0.5% provides the characteristic rosy-metallic note. Blend in glass vessel, mature 48 h. Contact us for detailed SOP and PFD.",
      equipment:["Glass blending vessel","Analytical balance","Olfactory evaluation","GC-MS analysis"] },
    { id:"fr3", name:"Oud Wood Accord", sub:"Middle Eastern luxury, smoky resinous", score:94, tags:["oud","wood","oriental"], free:true,
      ingredients:[
        {n:"Agarwood Essential Oil (Oud)",  p:5,   c:25000},
        {n:"Iso E Super",                   p:25,  c:600},
        {n:"Cedarwood Atlas EO",            p:20,  c:450},
        {n:"Vetiver EO",                    p:10,  c:1200},
        {n:"Patchouli EO",                  p:10,  c:900},
        {n:"Labdanum Absolute",             p:5,   c:3500},
        {n:"Benzyl Benzoate",               p:15,  c:180},
        {n:"DPG",                           p:10,  c:120},
      ],
      process:"Oud accord blended with cedarwood and vetiver as woody base. Labdanum provides resinous depth. High-value oud oil must be handled carefully — weigh first, add other components around it. Mature minimum 72 h for best character. Contact us for PFD.",
      equipment:["Glass vessel","Analytical balance 0.001g","Maturation storage 20°C","GC-MS"] },
    { id:"fr4", name:"Fresh Citrus Top Note", sub:"Bright, zesty opening burst", score:85, tags:["citrus","top note","fresh"],
      ingredients:[
        {n:"Bergamot EO (bergapten-free)",  p:30,  c:1800},
        {n:"Lemon EO cold-pressed",         p:25,  c:800},
        {n:"Sweet Orange EO",               p:20,  c:350},
        {n:"Grapefruit EO",                 p:15,  c:500},
        {n:"Lime EO distilled",             p:5,   c:600},
        {n:"Limonene (synthetic, >97%)",    p:5,   c:180},
      ],
      process:"Citrus top notes are the most volatile fraction. Blend at room temperature, avoid heat. Bergapten-free bergamot is essential for leave-on products (no phototoxicity). Use within 6 months. Contact us for detailed guidelines.",
      equipment:["Glass vessel","Cold storage after blending","GC-MS","Stability test"] },
    { id:"fr5", name:"Lavender Aromatic Accord", sub:"Classic fougère lavender base", score:87, tags:["lavender","aromatic","fougère"],
      ingredients:[
        {n:"Lavender EO (high altitude)",   p:40,  c:1500},
        {n:"Linalool",                      p:20,  c:500},
        {n:"Linalyl Acetate",               p:20,  c:550},
        {n:"Coumarin",                      p:5,   c:280},
        {n:"Dihydromyrcenol",               p:10,  c:250},
        {n:"DPG",                           p:5,   c:120},
      ],
      process:"Lavender accord using natural EO boosted with key isolates. Coumarin provides the classic fougère dry-down. Blend at ambient temperature. Contact us for full SOP.",
      equipment:["Glass blending vessel","Analytical balance","GC-MS"] },
    { id:"fr6", name:"Sandalwood Creamy Accord", sub:"Warm, creamy, long-lasting base", score:92, tags:["sandalwood","base note","woody"],
      ingredients:[
        {n:"Sandalwood EO (Australian)",    p:15,  c:8000},
        {n:"Javanol (synthetic sandalwood)",p:20,  c:2200},
        {n:"Ebanol",                        p:15,  c:1800},
        {n:"Santaliff",                     p:15,  c:1500},
        {n:"Amyris EO",                     p:20,  c:600},
        {n:"Benzyl Benzoate",               p:15,  c:180},
      ],
      process:"Synthetic sandalwood materials (Javanol, Ebanol) replicate and extend natural sandalwood sustainably. Blend with natural amyris as extender. Mature 48 h for smooth character. Contact us for PFD.",
      equipment:["Glass vessel","Analytical balance","GC-MS"] },
    { id:"fr7", name:"Jasmine Floral Absolute", sub:"Indolic floral, classic white flower", score:93, tags:["jasmine","floral","absolute"],
      ingredients:[
        {n:"Jasmine Absolute (India)",      p:5,   c:18000},
        {n:"Hedione (methyl dihydrojasmonate)",p:25,c:600},
        {n:"Indole 10% DPG",               p:3,   c:800},
        {n:"Benzyl Acetate",               p:30,  c:250},
        {n:"Linalool",                     p:20,  c:500},
        {n:"Phenyl Ethyl Alcohol",         p:15,  c:400},
        {n:"Benzyl Alcohol",               p:2,   c:180},
      ],
      process:"Jasmine accord built around hedione as the green-floral diffusive note. Indole at low % provides natural jasmine character without overwhelming. Absolute is fixed last after maturation. Contact us for PFD.",
      equipment:["Glass vessel","Analytical balance 0.001g","GC-MS","Olfactory panel"] },
    { id:"fr8", name:"Aquatic Marine Accord", sub:"Fresh ocean breeze, modern clean", score:86, tags:["aquatic","marine","fresh"],
      ingredients:[
        {n:"Calone 1951 (10% DPG)",        p:5,   c:1200},
        {n:"Dihydromyrcenol",              p:30,  c:250},
        {n:"Hedione",                      p:20,  c:600},
        {n:"Iso E Super",                  p:15,  c:600},
        {n:"Ambergris Tincture / Ambroxide",p:10, c:2200},
        {n:"Linalool",                     p:10,  c:500},
        {n:"DPG",                          p:10,  c:120},
      ],
      process:"Aquatic accord centred on Calone — use at low dosage (0.05–0.2% in final fragrance) as it is very powerful. Dihydromyrcenol provides fresh clean character. Ambroxide adds depth. Contact us for PFD.",
      equipment:["Glass vessel","Analytical balance 0.001g","GC-MS"] },
    { id:"fr9", name:"Amber Resinous Base", sub:"Warm amber, sweet oriental base", score:90, tags:["amber","base note","oriental"],
      ingredients:[
        {n:"Ambroxide / Ambroxan",         p:10,  c:2200},
        {n:"Benzyl Benzoate",              p:20,  c:180},
        {n:"Ethylene Brassylate",          p:15,  c:700},
        {n:"Labdanum Absolute",            p:5,   c:3500},
        {n:"Benzaldehyde",                 p:5,   c:280},
        {n:"Vanillin",                     p:10,  c:350},
        {n:"Iso E Super",                  p:15,  c:600},
        {n:"DPG",                          p:20,  c:120},
      ],
      process:"Amber accord using Ambroxan as the key mineral-woody note, supported by vanillin sweetness and labdanum resin. Blend at 40°C for better solubility of benzyl benzoate. Mature 48 h. Contact us for PFD.",
      equipment:["Heated blending vessel 40°C","Analytical balance","GC-MS"] },
    { id:"fr10", name:"Vetiver Earthy Accord", sub:"Smoky, earthy, rooty base note", score:89, tags:["vetiver","earthy","base note"],
      ingredients:[
        {n:"Vetiver EO (Haiti)",            p:30,  c:1200},
        {n:"Cedarwood Atlas EO",            p:20,  c:450},
        {n:"Iso E Super",                   p:20,  c:600},
        {n:"Patchouli EO",                  p:10,  c:900},
        {n:"Benzyl Benzoate",               p:10,  c:180},
        {n:"DPG",                           p:10,  c:120},
      ],
      process:"Vetiver accord using Haiti vetiver for best earthy-smoky character. Iso E Super amplifies the woody facets. Patchouli adds depth and longevity. Mature 72 h for best blending. Contact us for PFD.",
      equipment:["Glass vessel","Analytical balance","GC-MS","Maturation storage"] },
    { id:"fr11", name:"Neroli Petitgrain White Floral", sub:"Clean citrus-floral, Mediterranean", score:88, tags:["neroli","citrus","floral"],
      ingredients:[
        {n:"Neroli EO (Tunisia)",           p:10,  c:12000},
        {n:"Petitgrain EO",                 p:20,  c:800},
        {n:"Linalool",                      p:25,  c:500},
        {n:"Linalyl Acetate",               p:20,  c:550},
        {n:"Phenyl Ethyl Alcohol",          p:15,  c:400},
        {n:"DPG",                           p:10,  c:120},
      ],
      process:"Neroli accord using precious neroli EO extended with petitgrain (from the same orange tree). Linalool and linalyl acetate provide the clean floral-citrus character at lower cost. Contact us for PFD.",
      equipment:["Glass vessel","Analytical balance 0.001g","GC-MS"] },
    { id:"fr12", name:"Tobacco Vanilla Gourmand", sub:"Warm, smoky, addictive gourmand", score:92, tags:["tobacco","vanilla","gourmand"],
      ingredients:[
        {n:"Tobacco Absolute",              p:5,   c:6000},
        {n:"Vanillin",                      p:15,  c:350},
        {n:"Ethyl Vanillin",               p:5,   c:600},
        {n:"Coumarin",                      p:10,  c:280},
        {n:"Benzyl Benzoate",              p:20,  c:180},
        {n:"Iso E Super",                   p:15,  c:600},
        {n:"Cashmeran",                     p:10,  c:950},
        {n:"DPG",                           p:20,  c:120},
      ],
      process:"Tobacco vanilla gourmand — tobacco absolute provides depth and character at low %. Vanillin and ethyl vanillin create sweetness. Coumarin adds a dry, hay-like quality. Mature 72 h for full character development. Contact us for PFD.",
      equipment:["Glass vessel","Analytical balance","GC-MS","Maturation 72h"] },
  ],

  nutra:[
    { id:"nt1", name:"Whey Protein Concentrate (WPC-80)", sub:"80% protein, chocolate flavour", score:90, tags:["whey","protein","WPC-80"], free:true,
      ingredients:[
        {n:"Whey Protein Concentrate 80%",  p:75,  c:380},
        {n:"Cocoa Powder (10-12% fat)",     p:8,   c:180},
        {n:"Maltodextrin DE-18",            p:10,  c:45},
        {n:"Sucralose",                     p:0.05,c:800},
        {n:"Soy Lecithin (instantiser)",    p:0.50,c:180},
        {n:"Carrageenan (thickener)",       p:0.30,c:350},
        {n:"Salt",                          p:0.50,c:5},
        {n:"Chocolate Flavour",             p:1,   c:1200},
        {n:"Vitamin & Mineral Premix",      p:2,   c:600},
        {n:"Digestive Enzyme Blend",        p:0.50,c:1800},
      ],
      process:"Whey protein powder manufactured by dry blending of all ingredients in a ribbon blender. WPC-80 must be food-grade and tested for heavy metals and microbial limits. Soy lecithin improves instantisation (dispersibility in water). Pack in nitrogen-flushed pouches to prevent oxidation. Contact us for Process Flow Diagram.",
      equipment:["Ribbon blender food-grade SS","Nitrogen flushing system","Pouch filling machine","Sieve 500µm","Metal detector"] },
    { id:"nt2", name:"Plant Protein Blend (Pea + Rice)", sub:"Vegan complete protein, 75% protein", score:88, tags:["plant protein","vegan","pea protein"], free:true,
      ingredients:[
        {n:"Pea Protein Isolate 85%",       p:50,  c:280},
        {n:"Brown Rice Protein 80%",        p:25,  c:220},
        {n:"Maltodextrin DE-18",            p:10,  c:45},
        {n:"Inulin (prebiotic)",            p:5,   c:180},
        {n:"Sucralose",                     p:0.05,c:800},
        {n:"Vanilla Flavour",               p:1,   c:1200},
        {n:"Soy Lecithin",                  p:0.50,c:180},
        {n:"Ashwagandha Extract KSM-66",    p:0.50,c:2500},
        {n:"Vitamin B12",                   p:0.002,c:8000},
        {n:"Iron Bisglycinate",             p:0.10,c:1200},
      ],
      process:"Pea and rice protein are blended in 2:1 ratio for complete amino acid profile complementarity. Pea provides lysine; rice provides methionine and cysteine. Ashwagandha adds adaptogenic benefit. Dry blend in ribbon blender, nitrogen flush, pack. Contact us for Process Flow Diagram.",
      equipment:["Ribbon blender food-grade","Nitrogen flusher","Pouch filler","Metal detector","Microbial testing"] },
    { id:"nt3", name:"Electrolyte Hydration Powder", sub:"ORS plus, tropical flavour, workout recovery", score:87, tags:["electrolyte","hydration","ORS"], free:true,
      ingredients:[
        {n:"Sodium Chloride",               p:0.87,c:5},
        {n:"Potassium Chloride",            p:0.30,c:45},
        {n:"Magnesium Citrate",             p:0.20,c:280},
        {n:"Calcium Lactate",              p:0.15,c:180},
        {n:"Dextrose Monohydrate",          p:60,  c:38},
        {n:"Sucrose",                       p:25,  c:40},
        {n:"Citric Acid",                   p:2,   c:60},
        {n:"Vitamin C (Ascorbic Acid)",     p:0.50,c:180},
        {n:"Zinc Gluconate",               p:0.10,c:450},
        {n:"Tropical Mango Flavour",        p:1,   c:1200},
        {n:"Sucralose",                     p:0.02,c:800},
        {n:"Beta Carotene (colour)",        p:0.05,c:800},
      ],
      process:"Electrolyte powder dry blended ensuring homogeneous mineral distribution. Dextrose and sucrose ratio provides rapid and sustained energy. WHO ORS osmolarity guideline followed (~245 mOsmol/L when dissolved per serving). Contact us for Process Flow Diagram.",
      equipment:["Ribbon blender food-grade","Sachet filling machine","Metal detector","Osmolarity check"] },
    { id:"nt4", name:"Testosterone Booster Formula", sub:"Natural, Ashwagandha + Zinc + Fenugreek", score:85, tags:["testosterone","men health","adaptogen"],
      ingredients:[
        {n:"Ashwagandha Root Extract KSM-66 (5% withanolides)",p:15,c:2500},
        {n:"Fenugreek Seed Extract (50% saponins)",           p:10,c:1800},
        {n:"Zinc Picolinate",                                 p:2,  c:1200},
        {n:"Vitamin D3 (Cholecalciferol)",                    p:0.10,c:3500},
        {n:"Magnesium Bisglycinate",                          p:8,  c:400},
        {n:"Tribulus Terrestris Extract (40% saponins)",      p:10, c:800},
        {n:"Black Pepper Extract (Bioperine 95% piperine)",   p:0.50,c:2200},
        {n:"Microcrystalline Cellulose (MCC)",                p:40, c:80},
        {n:"Magnesium Stearate (lubricant)",                  p:1,  c:120},
        {n:"HPMC Capsule Shell",                              p:5,  c:180},
      ],
      process:"Testosterone support supplement in capsule form. All herbal extracts must have standardised active content verified by HPLC. Blend excipients + actives in planetary mixer, encapsulate in HPMC veggie capsules. Stability testing at 40°C/75% RH mandatory. Contact us for Process Flow Diagram.",
      equipment:["Planetary mixer","Capsule filling machine (size 0)","HPLC for standardisation","Dissolution tester","Stability chamber"] },
    { id:"nt5", name:"Whey Protein Isolate (WPI-90)", sub:"90% protein, lactose-free, lean muscle", score:93, tags:["whey isolate","WPI","lactose-free"],
      ingredients:[
        {n:"Whey Protein Isolate 90%",      p:85,  c:580},
        {n:"Maltodextrin DE-18",            p:5,   c:45},
        {n:"Sucralose",                     p:0.05,c:800},
        {n:"Soy Lecithin",                  p:0.50,c:180},
        {n:"Vanilla Flavour",               p:1,   c:1200},
        {n:"Vitamin & Mineral Premix",      p:2,   c:600},
        {n:"L-Glutamine",                   p:2,   c:450},
        {n:"BCAA Blend (2:1:1)",            p:3,   c:550},
        {n:"Digestive Enzyme Blend",        p:0.50,c:1800},
      ],
      process:"WPI is ion-exchange or cross-flow micro-filtered for >90% protein content and near-zero lactose. Premium product requires cold-chain storage. Dry blend at low temperature. Nitrogen flush mandatory. Contact us for Process Flow Diagram.",
      equipment:["Food-grade ribbon blender","Cold storage","Nitrogen flusher","Kjeldahl protein analyser","Metal detector"] },
    { id:"nt6", name:"Hangover Relief Effervescent", sub:"Liver support, anti-oxidant, rehydration", score:86, tags:["hangover","effervescent","liver support"],
      ingredients:[
        {n:"Sodium Bicarbonate",            p:20,  c:12},
        {n:"Citric Acid",                   p:15,  c:60},
        {n:"Vitamin C (Ascorbic Acid)",     p:5,   c:180},
        {n:"B-Vitamin Complex (B1,B2,B6,B12)",p:1, c:1200},
        {n:"N-Acetyl Cysteine (NAC)",       p:3,   c:800},
        {n:"Milk Thistle Extract (80% silymarin)",p:3,c:1500},
        {n:"Electrolyte Blend (Na+K+Mg)",   p:5,   c:180},
        {n:"Sucrose",                       p:30,  c:40},
        {n:"Lemon Flavour",                 p:1,   c:1200},
        {n:"Sucralose",                     p:0.05,c:800},
        {n:"PEG 6000 (binder)",            p:2,   c:180},
      ],
      process:"Effervescent tablet manufactured by dry granulation of organic acid + bicarbonate + other ingredients separately, then blending and compression. Humidity control critical (<25% RH) throughout manufacturing. NAC and milk thistle support liver detoxification. Contact us for Process Flow Diagram.",
      equipment:["Effervescent tablet press","Humidity controlled room <25% RH","Dissolution tester","Hardness tester","Alu-Alu blister packer"] },
    { id:"nt7", name:"Yeast Protein Powder", sub:"Complete protein, all essential amino acids, vegan", score:84, tags:["yeast protein","vegan","complete protein"],
      ingredients:[
        {n:"Nutritional Yeast Protein 55%", p:70,  c:180},
        {n:"Pea Protein Isolate",           p:15,  c:280},
        {n:"Maltodextrin",                  p:8,   c:45},
        {n:"Inulin",                        p:3,   c:180},
        {n:"Flavour (cheese/unflavoured)",  p:1,   c:800},
        {n:"Salt",                          p:0.50,c:5},
        {n:"B-Vitamin Complex",             p:0.50,c:1200},
      ],
      process:"Yeast protein from Saccharomyces cerevisiae provides all essential amino acids with high digestibility. Nutty/umami flavour works well in savoury applications. Dry blend in ribbon blender. Contact us for Process Flow Diagram.",
      equipment:["Ribbon blender food-grade","Nitrogen flusher","Kjeldahl protein analyser","Metal detector"] },
    { id:"nt8", name:"Pre-Workout Energy Formula", sub:"Caffeine + Beta-Alanine + Citrulline, explosive energy", score:89, tags:["pre-workout","caffeine","energy"],
      ingredients:[
        {n:"L-Citrulline Malate 2:1",       p:20,  c:450},
        {n:"Beta-Alanine",                  p:10,  c:350},
        {n:"Caffeine Anhydrous",            p:1.50,c:600},
        {n:"Creatine Monohydrate",          p:15,  c:280},
        {n:"L-Arginine HCl",               p:5,   c:380},
        {n:"Taurine",                       p:5,   c:350},
        {n:"Vitamin B6",                    p:0.10,c:800},
        {n:"Dextrose",                      p:30,  c:38},
        {n:"Citric Acid",                   p:2,   c:60},
        {n:"Berry Flavour",                 p:1,   c:1200},
        {n:"Sucralose",                     p:0.05,c:800},
      ],
      process:"Pre-workout blend — caffeine must be accurately weighed (±0.1g) as dosage is critical. Beta-alanine causes tingling (paresthesia) — label warning required. Blend all dry ingredients, add flavour last. Contact us for Process Flow Diagram.",
      equipment:["Ribbon blender","Analytical balance ±0.1g","Sachet filler","Metal detector","HPLC for caffeine assay"] },
    { id:"nt9", name:"Collagen Peptide Beauty Drink", sub:"Marine collagen + Vitamin C + Hyaluronic Acid", score:91, tags:["collagen","beauty","anti-aging"],
      ingredients:[
        {n:"Marine Collagen Peptides (MW <3000 Da)",p:40,c:1200},
        {n:"Vitamin C (Ascorbic Acid)",             p:5,  c:180},
        {n:"Hyaluronic Acid (low MW)",              p:1,  c:4500},
        {n:"Biotin",                                p:0.01,c:5000},
        {n:"Zinc Gluconate",                        p:0.50,c:450},
        {n:"Grape Seed Extract (OPC 95%)",          p:1,  c:2200},
        {n:"Maltodextrin",                          p:35, c:45},
        {n:"Strawberry Flavour",                    p:1,  c:1200},
        {n:"Sucralose",                             p:0.05,c:800},
        {n:"Citric Acid",                           p:2,  c:60},
      ],
      process:"Premium beauty supplement using hydrolysed marine collagen with low molecular weight for superior absorption. Vitamin C is essential co-factor for collagen synthesis. Hyaluronic acid for skin hydration. Dry blend, nitrogen flush, sachet pack. Contact us for Process Flow Diagram.",
      equipment:["Ribbon blender food-grade","Nitrogen flusher","Sachet filler","HPLC for collagen verification","Metal detector"] },
    { id:"nt10", name:"Immunity Booster Effervescent", sub:"Vitamin C + Zinc + Elderberry, daily immune support", score:88, tags:["immunity","vitamin C","zinc"],
      ingredients:[
        {n:"Vitamin C (Ascorbic Acid)",     p:10,  c:180},
        {n:"Sodium Bicarbonate",            p:18,  c:12},
        {n:"Citric Acid",                   p:14,  c:60},
        {n:"Zinc Gluconate",               p:1,   c:450},
        {n:"Elderberry Extract (10:1)",     p:2,   c:1800},
        {n:"Vitamin D3",                    p:0.05,c:3500},
        {n:"Selenium (as selenomethionine)",p:0.02,c:2500},
        {n:"Sucrose",                       p:40,  c:40},
        {n:"Orange Flavour",               p:1,   c:1200},
        {n:"Sucralose",                     p:0.05,c:800},
        {n:"PEG 6000",                     p:2,   c:180},
      ],
      process:"Immune support effervescent tablet. Manufacturing in low humidity (<25% RH) is critical. Elderberry extract standardised for anthocyanins. Separate granulation of acid and base phases before blending and compression. Contact us for Process Flow Diagram.",
      equipment:["Effervescent tablet press","Humidity controlled room","Dissolution tester","Stability chamber","Alu-Alu blister packer"] },
  ],
    chemeng:CHEMENG_DATA,
};

const Pill = ({label, color="#64748b"}) => (
  <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:99,fontSize:9,fontWeight:700,padding:"2px 7px",letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>
);

function Ring({score, size=44}){
  const r=size/2-5, circ=2*Math.PI*r, dash=(score/100)*circ;
  const col=score>=90?"#34d399":score>=80?"#e8a838":"#f87171";
  const [show,setShow]=useState(false);
  
  const getDesc=()=>{
    if(score>=95) return "⭐ Exceptional — industry-leading formulation with premium performance";
    if(score>=90) return "✅ Excellent — high performance, production-ready formulation";
    if(score>=85) return "👍 Very Good — solid formulation with good performance balance";
    if(score>=80) return "✔️ Good — reliable formulation, suitable for most applications";
    if(score>=75) return "⚠️ Average — functional but has room for optimisation";
    return "🔧 Basic — starting point formulation, recommend AI optimisation";
  };

  const getLabel=()=>{
    if(score>=95) return "Exceptional";
    if(score>=90) return "Excellent";
    if(score>=85) return "Very Good";
    if(score>=80) return "Good";
    if(score>=75) return "Average";
    return "Basic";
  };

  return(
    <div style={{position:"relative",flexShrink:0,cursor:"pointer"}}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}
      onClick={()=>setShow(v=>!v)}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="4"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="4" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{transition:"all 1s"}}/>
        <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle" fill={col} fontSize="11" fontWeight="800" style={{transform:`rotate(90deg)`,transformOrigin:`${size/2}px ${size/2}px`}}>{score}</text>
      </svg>
      {show&&(
        <div style={{position:"absolute",right:0,top:size+4,background:"#0a0f1e",border:`1px solid ${col}44`,borderRadius:10,padding:"8px 12px",zIndex:100,width:200,boxShadow:"0 4px 20px #00000088",pointerEvents:"none"}}>
          <div style={{color:col,fontWeight:700,fontSize:12,marginBottom:3}}>{score}/100 — {getLabel()}</div>
          <div style={{color:"#94a3b8",fontSize:11,lineHeight:1.5}}>{getDesc()}</div>
          <div style={{color:"#334155",fontSize:9,marginTop:6}}>Score based on formula balance, ingredient quality & performance potential</div>
        </div>
      )}
    </div>
  );
}

function PaymentPortal({onSuccess, onCancel}){
  const [step,setStep]=useState("confirm");
  const [email,setEmail]=useState("");
  const [txnId,setTxnId]=useState("");
  const [err,setErr]=useState("");

  const handlePay=()=>{
    window.open(RZP.annual,"_blank");
    setStep("verify");
  };

  const handleActivate=()=>{
    if(!email.trim()||!email.includes("@")){setErr("Enter your email");return;}
    if(!txnId.trim()||txnId.length<6){setErr("Enter your Razorpay Payment ID from confirmation SMS/email");return;}
    setErr("");
    setStep("done");
  };

  return(
    <div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:20,padding:28,maxWidth:400,width:"100%",textAlign:"center"}}>
        {step==="confirm"&&<>
          <div style={{fontSize:36,marginBottom:10}}>🔓</div>
          <div style={{color:"#f1f5f9",fontWeight:900,fontSize:17,marginBottom:4}}>Annual Formula Access</div>
          <div style={{color:"#4f9cf9",fontWeight:900,fontSize:32,marginBottom:4}}>₹3,999</div>
          <div style={{color:"#475569",fontSize:12,marginBottom:16}}>365 days · All 250+ formulas · 30 AI/month · No auto-debit</div>
          <div style={{display:"flex",gap:9}}>
            <button onClick={onCancel} style={{flex:1,padding:"11px",background:"transparent",border:"1px solid #1e293b",borderRadius:10,color:"#475569",fontWeight:600,fontSize:13,cursor:"pointer"}}>← Back</button>
            <button onClick={handlePay} style={{flex:2,padding:"11px",background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>
              Pay ₹3,999 via Razorpay →
            </button>
          </div>
          <div style={{color:"#334155",fontSize:10,marginTop:10}}>🔒 UPI · Cards · Net Banking · Wallets</div>
        </>}
        {step==="verify"&&<>
          <div style={{fontSize:40,marginBottom:12}}>✅</div>
          <div style={{color:"#f1f5f9",fontWeight:800,fontSize:16,marginBottom:8}}>Payment Done? Activate Now</div>
          <div style={{color:"#64748b",fontSize:12,marginBottom:14,lineHeight:1.6}}>Enter your email and Razorpay Payment ID from the confirmation SMS/email to activate your plan.</div>
          <div style={{textAlign:"left",marginBottom:10}}>
            <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5}}>Your Email *</div>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"
              style={{width:"100%",background:"#060b14",border:"1px solid #334155",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:10}}/>
            <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5}}>Razorpay Payment ID *</div>
            <input value={txnId} onChange={e=>setTxnId(e.target.value)} placeholder="pay_xxxxxxxxxxxxxxxxx"
              style={{width:"100%",background:"#060b14",border:"1px solid #334155",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            <div style={{color:"#334155",fontSize:10,marginTop:4}}>From Razorpay confirmation SMS or email</div>
          </div>
          {err&&<div style={{color:"#f87171",fontSize:11,padding:"8px",background:"#f8717111",borderRadius:8,marginBottom:8,textAlign:"left"}}>{err}</div>}
          <button onClick={handleActivate} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#34d399,#10b981)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",marginBottom:8}}>
            ✅ Activate My Annual Plan
          </button>
          <button onClick={handlePay} style={{width:"100%",padding:"9px",background:"transparent",border:"1px solid #1e293b",borderRadius:10,color:"#475569",fontSize:12,cursor:"pointer",marginBottom:6}}>
            🔗 Reopen Payment Link
          </button>
          <div style={{color:"#334155",fontSize:10}}>Not received? Email <a href="mailto:info@chemformpro.in" style={{color:"#4f9cf9",textDecoration:"none"}}>info@chemformpro.in</a></div>
        </>}
        {step==="done"&&<>
          <div style={{fontSize:44,marginBottom:10}}>🎉</div>
          <div style={{color:"#34d399",fontWeight:900,fontSize:18,marginBottom:8}}>Plan Activated!</div>
          <div style={{color:"#64748b",fontSize:13,lineHeight:1.7,marginBottom:4}}>
            Welcome! All 250+ formulas are now unlocked for 365 days.<br/>
            Payment ref: <span style={{color:"#475569"}}>{txnId}</span>
          </div>
          <button onClick={()=>onSuccess({email,txnId,plan:"annual",expires:Date.now()+(365*24*60*60*1000)})}
            style={{marginTop:14,width:"100%",padding:"12px",background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer"}}>
            Start Exploring →
          </button>
        </>}
      </div>
    </div>
  );
}

function LoginScreen({onLogin}){
  const [showForm,setShowForm]=useState(false);
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [city,setCity]=useState("");
  const [country,setCountry]=useState("India");
  const [industry,setIndustry]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const handleStart=async()=>{
    if(!name.trim()){setErr("Please enter your name");return;}
    if(!email.trim()||!email.includes("@")){setErr("Please enter a valid email");return;}
    if(!industry){setErr("Please select your industry");return;}
    setLoading(true);
    try{
      await fetch("https://zpuzqnitczhgllgohrba.supabase.co/rest/v1/profiles",{
        method:"POST",
        headers:{
          "apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdXpxbml0Y3poZ2xsZ29ocmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjIzNjIsImV4cCI6MjA5NDIzODM2Mn0.rM7RVpDW4o4j3GnyMVMBO_qkBPlo2zMTe5yG2v5SAH4",
          "Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdXpxbml0Y3poZ2xsZ29ocmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjIzNjIsImV4cCI6MjA5NDIzODM2Mn0.rM7RVpDW4o4j3GnyMVMBO_qkBPlo2zMTe5yG2v5SAH4",
          "Content-Type":"application/json",
          "Prefer":"resolution=merge-duplicates",
        },
        body:JSON.stringify({email:email.trim(),name:name.trim(),city,country,industry,plan:"free"}),
      });
    }catch(e){}
    setLoading(false);
    const u={name:name.trim(),email:email.trim(),city,country,industry,plan:"free"};
    try{window.localStorage.setItem("chemform_user",JSON.stringify(u));}catch(e){}
    onLogin(u);
  };

  if(showForm) return(
    <div style={{position:"fixed",inset:0,background:"#060b14",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16,overflowY:"auto",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:20,padding:24,maxWidth:420,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 10px"}}>⚗</div>
          <div style={{color:"#f1f5f9",fontWeight:900,fontSize:20}}>ChemForm <span style={{color:"#4f9cf9"}}>Pro</span></div>
          <div style={{color:"#475569",fontSize:12,marginTop:3}}>Create your free account to save progress</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div>
            <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Your Name *</div>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name"
              style={{width:"100%",background:"#060b14",border:"1px solid #1e293b",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div>
            <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Work Email *</div>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" type="email"
              style={{width:"100%",background:"#060b14",border:"1px solid #1e293b",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}>
              <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>City</div>
              <input value={city} onChange={e=>setCity(e.target.value)} placeholder="City"
                style={{width:"100%",background:"#060b14",border:"1px solid #1e293b",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Country</div>
              <input value={country} onChange={e=>setCountry(e.target.value)} placeholder="Country"
                style={{width:"100%",background:"#060b14",border:"1px solid #1e293b",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
          </div>
          <div>
            <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Your Industry *</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {INDUSTRIES.map(ind=>(
                <div key={ind.id} onClick={()=>setIndustry(ind.id)}
                  style={{padding:"7px 10px",borderRadius:9,border:`1px solid ${industry===ind.id?"#4f9cf9":"#1e293b"}`,background:industry===ind.id?"#4f9cf915":"#060b14",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:13}}>{ind.icon}</span>
                  <span style={{color:industry===ind.id?"#4f9cf9":"#64748b",fontSize:10,fontWeight:600,lineHeight:1.3}}>{ind.label}</span>
                </div>
              ))}
            </div>
          </div>
          {err&&<div style={{color:"#f87171",fontSize:12,padding:"8px 12px",background:"#f8717111",borderRadius:8}}>{err}</div>}
          <button onClick={handleStart} disabled={loading}
            style={{padding:"13px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",color:"#fff",fontWeight:800,fontSize:15,cursor:loading?"wait":"pointer",marginTop:4}}>
            {loading?"Saving...":"Create Account →"}
          </button>
          <div style={{textAlign:"center",color:"#334155",fontSize:11}}>Free · No credit card · No password needed</div>
          <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",color:"#334155",fontSize:11,cursor:"pointer",textDecoration:"underline"}}>← Back</button>
        </div>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#060b14",color:"#f1f5f9",fontFamily:"'DM Sans',system-ui,sans-serif",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .lp-btn:hover{opacity:0.9;transform:translateY(-1px);}
        .lp-card:hover{border-color:#4f9cf944!important;background:#0d1626!important;}
        .lp-cat:hover{border-color:#4f9cf933!important;}
      `}</style>

      {/* Nav */}
      <div style={{borderBottom:"1px solid #1e293b",padding:"14px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#060b14cc",backdropFilter:"blur(10px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⚗</div>
          <div>
            <div style={{fontWeight:900,fontSize:17,letterSpacing:"-0.3px"}}>ChemForm <span style={{color:"#4f9cf9"}}>Pro</span></div>
            <div style={{fontSize:9,color:"#334155",letterSpacing:"0.06em",textTransform:"uppercase"}}>by Vaani Enterprises</div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button onClick={()=>setShowForm(true)} style={{background:"transparent",border:"1px solid #1e293b",color:"#94a3b8",fontWeight:600,fontSize:13,padding:"8px 18px",borderRadius:8,cursor:"pointer"}}>
            Register
          </button>
          <button onClick={()=>onLogin({name:"Guest",email:"",industry:"paints",plan:"free",isGuest:true})}
            style={{background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",color:"#fff",fontWeight:700,fontSize:13,padding:"9px 20px",borderRadius:8,cursor:"pointer"}}>
            Explore Free →
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{textAlign:"center",padding:"70px 24px 50px",maxWidth:820,margin:"0 auto"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#4f9cf922",border:"1px solid #4f9cf933",borderRadius:99,padding:"5px 16px",fontSize:12,color:"#4f9cf9",fontWeight:600,marginBottom:24}}>
          🚀 India's First AI Chemical Formulation Platform
        </div>
        <h1 style={{fontSize:"clamp(28px,6vw,54px)",fontWeight:900,lineHeight:1.15,marginBottom:18,background:"linear-gradient(135deg,#f1f5f9 30%,#64748b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          Professional Chemical Formulations,<br/>Powered by AI
        </h1>
        <p style={{color:"#64748b",fontSize:"clamp(14px,2.5vw,18px)",lineHeight:1.8,marginBottom:36,maxWidth:600,margin:"0 auto 36px"}}>
          250+ expert-verified formulations for paints, coatings, adhesives, cosmetics, fragrances, nutraceuticals and pharma APIs. Optimise cost and performance with AI in seconds.
        </p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button className="lp-btn" onClick={()=>onLogin({name:"Guest",email:"",industry:"paints",plan:"free",isGuest:true})}
            style={{background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",color:"#fff",fontWeight:800,fontSize:16,padding:"15px 36px",borderRadius:12,cursor:"pointer",transition:"all 0.2s"}}>
            Explore Formulas Free →
          </button>
          <button className="lp-btn" onClick={()=>setShowForm(true)}
            style={{background:"transparent",border:"1px solid #1e293b",color:"#94a3b8",fontWeight:600,fontSize:15,padding:"15px 28px",borderRadius:12,cursor:"pointer",transition:"all 0.2s"}}>
            Create Free Account
          </button>
        </div>
        <div style={{color:"#334155",fontSize:12,marginTop:14}}>✓ No credit card &nbsp;·&nbsp; ✓ No login required to browse &nbsp;·&nbsp; ✓ 250+ formulations</div>
      </div>

      {/* Stats */}
      <div style={{display:"flex",justifyContent:"center",gap:"clamp(24px,5vw,72px)",padding:"28px 24px",borderTop:"1px solid #1e293b",borderBottom:"1px solid #1e293b",background:"#0a0f1e",flexWrap:"wrap"}}>
        {[["250+","Formulations"],["13","Categories"],["195","Pharma APIs"],["AI","Optimizer"],["₹0","To Start"]].map(([n,l])=>(
          <div key={l} style={{textAlign:"center"}}>
            <div style={{color:"#4f9cf9",fontWeight:900,fontSize:"clamp(22px,5vw,36px)"}}>{n}</div>
            <div style={{color:"#475569",fontSize:12,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div style={{padding:"56px 24px",maxWidth:960,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <h2 style={{color:"#f1f5f9",fontSize:"clamp(20px,4vw,32px)",fontWeight:800,marginBottom:8}}>Every Chemical Industry Covered</h2>
          <p style={{color:"#64748b",fontSize:14}}>Expert-verified formulations across 13 categories</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10}}>
          {[
            {icon:"🏗️",label:"Drymix",eg:"Tile adhesive, grout, putty"},
            {icon:"🎨",label:"Paints",eg:"Emulsion, enamel, distemper"},
            {icon:"🛡️",label:"Coatings",eg:"Epoxy, PU, powder coat"},
            {icon:"🔗",label:"Adhesives",eg:"PU, epoxy, silicone, PSA"},
            {icon:"✨",label:"Cosmetics",eg:"Shampoo, cream, soap"},
            {icon:"🧹",label:"Homecare",eg:"Dishwash, floor cleaner"},
            {icon:"🌸",label:"Fragrances",eg:"Musk, oud, rose, jasmine"},
            {icon:"💪",label:"Nutraceuticals",eg:"Whey, collagen, electrolytes"},
            {icon:"🖨️",label:"Inks",eg:"Flexo, gravure, UV"},
            {icon:"🧵",label:"Sizing Agents",eg:"Warp sizing, AKD, ASA"},
            {icon:"🌱",label:"Agrochemicals",eg:"Insecticides, herbicides"},
            {icon:"💊",label:"Pharma API",eg:"195 active ingredients"},
            {icon:"⚗️",label:"ChemEng Pro",eg:"Resin & polymer synthesis"},
          ].map(cat=>(
            <div key={cat.label} className="lp-cat"
              onClick={()=>onLogin({name:"Guest",email:"",industry:"paints",plan:"free",isGuest:true})}
              style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:12,padding:"14px 10px",textAlign:"center",cursor:"pointer",transition:"all 0.2s"}}>
              <div style={{fontSize:22,marginBottom:6}}>{cat.icon}</div>
              <div style={{color:"#f1f5f9",fontWeight:700,fontSize:11,marginBottom:3}}>{cat.label}</div>
              <div style={{color:"#334155",fontSize:9,lineHeight:1.4}}>{cat.eg}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{background:"#0a0f1e",borderTop:"1px solid #1e293b",borderBottom:"1px solid #1e293b",padding:"56px 24px"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <h2 style={{textAlign:"center",color:"#f1f5f9",fontSize:"clamp(20px,4vw,32px)",fontWeight:800,marginBottom:36}}>Everything a Formulator Needs</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
            {[
              {icon:"🤖",t:"AI Formula Optimizer",d:"Reduce cost or maximise performance with one click. AI analyses every ingredient and explains each change with technical justification."},
              {icon:"⚖️",t:"Batch Calculator",d:"Enter batch size and local RM prices. Get exact quantities and total cost — in kg, MT or lbs. Updates instantly."},
              {icon:"✏️",t:"Live RM Price Editor",d:"Enter your local raw material prices and see formula cost update in real time. Compare vs industry benchmark."},
              {icon:"📊",t:"Performance Scores",d:"Every formula rated 0–100. Hover or tap to understand what the score means for your specific application."},
              {icon:"⚙️",t:"Process + Equipment",d:"Full manufacturing process, equipment list and process notes. Available as a one-time purchase per formula."},
              {icon:"📩",t:"Custom Formulation",d:"Need something specific? Submit a request. Our expert team delivers a complete formulation within 24 hours."},
            ].map(f=>(
              <div key={f.t} className="lp-card" style={{padding:20,background:"#060b14",borderRadius:14,border:"1px solid #1e293b",transition:"all 0.2s"}}>
                <div style={{fontSize:28,marginBottom:10}}>{f.icon}</div>
                <div style={{color:"#f1f5f9",fontWeight:700,fontSize:14,marginBottom:6}}>{f.t}</div>
                <div style={{color:"#64748b",fontSize:12,lineHeight:1.7}}>{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Founder Section */}
      <div style={{padding:"56px 24px",maxWidth:800,margin:"0 auto"}}>
        <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:20,padding:"36px 32px",display:"flex",gap:28,flexWrap:"wrap",alignItems:"flex-start"}}>
          <div style={{width:72,height:72,borderRadius:36,background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,flexShrink:0}}>👨‍🔬</div>
          <div style={{flex:1,minWidth:220}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4,flexWrap:"wrap"}}>
              <div style={{color:"#f1f5f9",fontWeight:800,fontSize:18}}>Chetan Jain</div>
              <div style={{background:"#4f9cf922",border:"1px solid #4f9cf933",borderRadius:99,padding:"2px 10px",fontSize:10,color:"#4f9cf9",fontWeight:600}}>IIT Bombay Alumni</div>
            </div>
            <div style={{color:"#4f9cf9",fontSize:12,fontWeight:600,marginBottom:14}}>Founder, Vaani Enterprises · ChemForm Pro</div>
            <p style={{color:"#64748b",fontSize:13,lineHeight:1.85,marginBottom:14}}>
              Chetan Jain is a Chemical Engineering graduate from the Indian Institute of Technology Bombay (IIT Bombay), one of India's most prestigious engineering institutions. With rich industry experience spanning paints, coatings, construction chemicals, adhesives and specialty chemicals, he has worked across formulation R&D, production scale-up and technical marketing roles.
            </p>
            <p style={{color:"#64748b",fontSize:13,lineHeight:1.85,marginBottom:18}}>
              ChemForm Pro was built out of a simple frustration — formulation knowledge is scattered, expensive and inaccessible to most small and mid-size manufacturers. Chetan founded Vaani Enterprises to democratise access to professional formulation expertise through technology, making it affordable for every chemist and manufacturer regardless of their scale.
            </p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {["IIT Bombay — B.Tech Chemical Engineering","Paints & Coatings","Construction Chemicals","Specialty Chemicals","Adhesives & Sealants"].map(tag=>(
                <span key={tag} style={{background:"#1e293b",color:"#64748b",fontSize:10,padding:"4px 10px",borderRadius:99,fontWeight:500}}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{background:"#0a0f1e",borderTop:"1px solid #1e293b",padding:"56px 24px"}}>
        <div style={{maxWidth:700,margin:"0 auto",textAlign:"center"}}>
          <h2 style={{color:"#f1f5f9",fontSize:"clamp(20px,4vw,32px)",fontWeight:800,marginBottom:8}}>Simple, Transparent Pricing</h2>
          <p style={{color:"#64748b",fontSize:14,marginBottom:36}}>Start free. Pay only for what you need.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
            <div style={{background:"#060b14",border:"1px solid #1e293b",borderRadius:14,padding:24,textAlign:"left"}}>
              <div style={{color:"#64748b",fontWeight:800,fontSize:16,marginBottom:4}}>Free</div>
              <div style={{color:"#f1f5f9",fontWeight:900,fontSize:28,marginBottom:12}}>₹0</div>
              {["Browse all formula names","3 free formulas per category (full)","1 AI optimization","Ads supported"].map(f=>(
                <div key={f} style={{color:"#64748b",fontSize:12,marginBottom:5,display:"flex",gap:6}}><span style={{color:"#34d399"}}>✓</span>{f}</div>
              ))}
              <button onClick={()=>onLogin({name:"Guest",email:"",industry:"paints",plan:"free",isGuest:true})}
                style={{width:"100%",marginTop:16,padding:"11px",background:"#1e293b",border:"none",borderRadius:10,color:"#f1f5f9",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                Start Free →
              </button>
            </div>
            <div style={{background:"#0d1628",border:"2px solid #4f9cf966",borderRadius:14,padding:24,textAlign:"left",position:"relative"}}>
              <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",color:"#fff",fontSize:9,fontWeight:700,padding:"3px 12px",borderRadius:99,whiteSpace:"nowrap"}}>BEST VALUE</div>
              <div style={{color:"#4f9cf9",fontWeight:800,fontSize:16,marginBottom:4}}>Annual</div>
              <div style={{color:"#f1f5f9",fontWeight:900,fontSize:28,marginBottom:2}}>₹3,999<span style={{color:"#475569",fontSize:12,fontWeight:400}}>/year</span></div>
              <div style={{color:"#334155",fontSize:10,marginBottom:12}}>≈ ₹333/month</div>
              {["All 250+ formulas unlocked","Batch calculator","30 AI optimizations/month","365-day access · No auto-debit"].map(f=>(
                <div key={f} style={{color:"#94a3b8",fontSize:12,marginBottom:5,display:"flex",gap:6}}><span style={{color:"#4f9cf9"}}>✓</span>{f}</div>
              ))}
              <button onClick={()=>window.open(RZP.annual,"_blank")}
                style={{width:"100%",marginTop:16,padding:"11px",background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>
                Get Annual Access →
              </button>
            </div>
          </div>
          <div style={{color:"#334155",fontSize:11}}>Or pay as you go: ₹49/formula · ₹99/AI credit · ₹999/process · ₹999/custom formulation</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{borderTop:"1px solid #1e293b",padding:"24px",textAlign:"center",background:"#060b14"}}>
        <div style={{color:"#f1f5f9",fontWeight:700,fontSize:14,marginBottom:4}}>ChemForm Pro by Vaani Enterprises</div>
        <div style={{color:"#334155",fontSize:11,marginBottom:10}}>Founded by Chetan Jain · IIT Bombay Chemical Engineering Alumni</div>
        <div style={{display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap"}}>
          <a href="/privacy.html" style={{color:"#334155",fontSize:11,textDecoration:"none"}}>Privacy Policy</a>
          <a href="/terms.html" style={{color:"#334155",fontSize:11,textDecoration:"none"}}>Terms of Service</a>
          <a href="mailto:info@chemformpro.in" style={{color:"#334155",fontSize:11,textDecoration:"none"}}>info@chemformpro.in</a>
        </div>
      </div>
    </div>
  );
}

function PricingModal({onClose, currency, onSelectPlan, currentPlan}){
  const openPay=(link)=>{ window.open(link,"_blank"); };
  return(
    <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:20,padding:24,maxWidth:520,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{color:"#f1f5f9",fontWeight:900,fontSize:18}}>Unlock ChemForm Pro</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#475569",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>

        {/* Annual Plan */}
        <div style={{background:"#0d1628",border:"2px solid #4f9cf944",borderRadius:14,padding:18,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{color:"#4f9cf9",fontWeight:900,fontSize:16,marginBottom:2}}>Annual Formula Access</div>
              <div style={{color:"#475569",fontSize:12}}>Best value — everything for a year</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{color:"#f1f5f9",fontWeight:900,fontSize:26}}>₹3,999</div>
              <div style={{color:"#475569",fontSize:10}}>/year</div>
            </div>
          </div>
          {["All 250+ formulas unlocked","Batch calculator for all formulas","30 AI optimizations per month","No interstitial ads"].map(f=>(
            <div key={f} style={{color:"#64748b",fontSize:11,marginBottom:4,display:"flex",gap:6}}>
              <span style={{color:"#4f9cf9"}}>✓</span>{f}
            </div>
          ))}
          <button onClick={()=>{openPay(RZP.annual);onClose();}}
            style={{width:"100%",marginTop:12,padding:"12px",background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer"}}>
            Pay ₹3,999 via Razorpay →
          </button>
          <div style={{color:"#334155",fontSize:10,textAlign:"center",marginTop:6}}>365 days · No auto-debit · Reminder 3 days before expiry</div>
        </div>

        {/* Divider */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <div style={{flex:1,height:1,background:"#1e293b"}}/>
          <div style={{color:"#334155",fontSize:11}}>or pay only for what you need</div>
          <div style={{flex:1,height:1,background:"#1e293b"}}/>
        </div>

        {/* Micro payments */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {[
            {label:"Single Formula",price:"₹49",desc:"Full ingredients + costs",link:RZP.formula49,icon:"📋"},
            {label:"AI Optimization",price:"₹99",desc:"1 AI credit",link:RZP.ai99,icon:"🤖"},
            {label:"AI Pack × 10",price:"₹799",desc:"10 AI credits (save ₹191)",link:RZP.ai799,icon:"⚡"},
            {label:"Process + Equipment",price:"₹999",desc:"1 formula full process",link:RZP.process999,icon:"⚙️"},
            {label:"Custom Formulation",price:"₹999",desc:"Expert delivers in 24h",link:RZP.custom999,icon:"📩"},
            {label:"Engineering Design",price:"Get Quote",desc:"Plant design, P&ID, scale-up",link:null,icon:"🏭"},
          ].map(item=>(
            <div key={item.label} style={{background:"#060b14",border:"1px solid #1e293b",borderRadius:10,padding:"12px 10px"}}>
              <div style={{fontSize:18,marginBottom:6}}>{item.icon}</div>
              <div style={{color:"#f1f5f9",fontSize:11,fontWeight:700,marginBottom:2}}>{item.label}</div>
              <div style={{color:"#475569",fontSize:10,marginBottom:8}}>{item.desc}</div>
              {item.link?(
                <button onClick={()=>openPay(item.link)}
                  style={{width:"100%",padding:"7px",background:"#1e293b",border:"1px solid #334155",borderRadius:7,color:"#f1f5f9",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                  {item.price} →
                </button>
              ):(
                <button onClick={()=>window.open("mailto:info@chemformpro.in?subject=Engineering Design Quote","_blank")}
                  style={{width:"100%",padding:"7px",background:"#fb923c22",border:"1px solid #fb923c44",borderRadius:7,color:"#fb923c",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                  Request Quote →
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{color:"#334155",fontSize:10,textAlign:"center"}}>
          After payment email <a href="mailto:info@chemformpro.in" style={{color:"#4f9cf9",textDecoration:"none"}}>info@chemformpro.in</a> with your payment ID to activate formula/process unlocks
        </div>
      </div>
    </div>
  );
}

function QBadge({used, limit, label, color="#34d399"}){
  const left=limit===999?999:Math.max(0,limit-used);
  const pct=limit>0&&limit!==999?Math.min(100,(used/limit)*100):0;
  const c=left===0?"#f87171":left<=2?"#e8a838":color;
  return(
    <div style={{background:"#0a0f1e",border:`1px solid ${c}33`,borderRadius:8,padding:"4px 8px",textAlign:"center",minWidth:48}}>
      <div style={{color:c,fontWeight:800,fontSize:12}}>{left===999?"∞":left}</div>
      <div style={{color:"#475569",fontSize:8}}>{label}</div>
      {limit!==999&&limit>0&&<div style={{background:"#1e293b",borderRadius:99,height:2,marginTop:2}}><div style={{width:`${pct}%`,height:2,borderRadius:99,background:c}}/></div>}
    </div>
  );
}

function FormulaDetail({formula, currency, planKey, usage, onUseQuota, onUpgrade}){
  const [tab,setTab]=useState("formula");
  // RM prices in INR — user edits per their local market
  const [rmPrices,setRmPrices]=useState({});
  const [showRME,setShowRME]=useState(false);

  useEffect(()=>{
    // Reset to formula defaults when formula changes
    const defaults={};
    formula.ingredients.forEach(i=>{ defaults[i.n]=i.c; });
    setRmPrices(defaults);
    setTab("formula");
    setShowRME(false);
  },[formula.id]);

  const plan=PLANS[planKey];
  const cat=CATEGORIES.find(c=>FORMULAS[c.id]?.some(f=>f.id===formula.id));
  const color=cat?.color||"#4f9cf9";

  // CORRECT CALCULATION: sum of (percentage/100 * price_per_kg) for each ingredient
  const customCostINR = formula.ingredients.reduce((total,ing)=>{
    const price=Number(rmPrices[ing.n]??ing.c);
    return total + (Number(ing.p)/100)*price;
  },0);

  const handleTab=(id)=>{
    const canProcess=false; // Per-formula unlock via ₹999
    const canEquip=canProcess;
    const canEngBasic=plan.engBasic;
    const canEngDetailed=plan.engDetailed;
    if(id==="process"){ if(!canProcess){onUpgrade("Manufacturing Process (Starter+)");return;} if(usage.process>=plan.process){onUpgrade(`Process quota full (${plan.process}/mo) — upgrade for more`);return;} onUseQuota("process"); }
    if(id==="equipment"){ if(!canEquip){onUpgrade("Equipment Sizing (Starter+)");return;} if(usage.equipment>=plan.equipment){onUpgrade(`Equipment quota full (${plan.equipment}/mo) — upgrade`);return;} onUseQuota("equipment"); }
    if((id==="engbasic"||id==="engdetailed")&&!canEngBasic){onUpgrade("Engineering Design (Pro+)");return;}
    if(id==="engdetailed"&&!canEngDetailed){onUpgrade("Detailed Engineering (Enterprise only)");return;}
    setTab(id);
  };

  return(
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div style={{flex:1,marginRight:8}}>
          <div style={{color:"#f1f5f9",fontSize:17,fontWeight:800,lineHeight:1.2}}>{formula.name}</div>
          <div style={{color:"#64748b",fontSize:11,marginTop:2}}>{formula.sub}</div>
          <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>{formula.tags.map(t=><Pill key={t} label={t} color={color}/>)}</div>
        </div>
        <Ring score={formula.score} size={50}/>
      </div>

      {/* Stats */}
      <div style={{display:"flex",gap:7,marginBottom:10}}>
        <div style={{flex:1,background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:9,padding:"8px",textAlign:"center"}}>
          <div style={{fontSize:14}}>🧪</div>
          <div style={{color:"#f1f5f9",fontWeight:700,fontSize:13}}>{formula.ingredients.length}</div>
          <div style={{color:"#475569",fontSize:9}}>Ingredients</div>
        </div>
        <div style={{flex:2,background:color+"11",border:`1px solid ${color}33`,borderRadius:9,padding:"8px",textAlign:"center"}}>
          <div style={{color:"#64748b",fontSize:10}}>Formula Cost/kg</div>
          <div style={{color:color,fontWeight:900,fontSize:20}}>{fmtCur(customCostINR,currency)}</div>
          <div style={{color:"#475569",fontSize:9}}>raw material cost only (excl. overheads, packaging, margin)</div>
        </div>
        <div onClick={()=>setShowRME(v=>!v)} style={{flex:1,background:showRME?"#34d39918":"#0a0f1e",border:`1px solid ${showRME?"#34d39966":"#34d39933"}`,borderRadius:9,padding:"8px",textAlign:"center",cursor:"pointer"}}>
          <div style={{fontSize:14}}>✏️</div>
          <div style={{color:"#34d399",fontWeight:700,fontSize:10}}>Edit RM</div>
          <div style={{color:"#475569",fontSize:9}}>Prices</div>
        </div>
      </div>

      {/* RM Editor — available to ALL plans */}
      {showRME&&(
        <div style={{background:"#060b14",border:"1px solid #34d39944",borderRadius:12,padding:14,marginBottom:10}}>
          <div style={{color:"#34d399",fontWeight:700,fontSize:12,marginBottom:4}}>✏️ Enter your local raw material prices (₹/kg)</div>
          <div style={{color:"#475569",fontSize:10,marginBottom:10}}>App automatically calculates formula cost = Σ (% × price/kg) for each ingredient</div>
          {formula.ingredients.map(ing=>{
            const localPrice=Number(rmPrices[ing.n]??ing.c);
            const contribution=(Number(ing.p)/100)*localPrice;
            return(
              <div key={ing.n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:"#94a3b8",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ing.n}</div>
                  <div style={{color:"#334155",fontSize:9}}>{ing.p}% → contributes {fmtCur(contribution,currency)}/kg to formula</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                  <span style={{color:"#475569",fontSize:10}}>₹</span>
                  <input type="number" step="0.01" min="0" value={localPrice}
                    onChange={e=>{
                      const v=parseFloat(e.target.value)||0;
                      setRmPrices(prev=>({...prev,[ing.n]:v}));
                    }}
                    style={{width:70,background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:6,padding:"5px 7px",color:"#f1f5f9",fontSize:12,outline:"none",textAlign:"right"}}/>
                  <span style={{color:"#334155",fontSize:9}}>/kg</span>
                </div>
              </div>
            );
          })}
          <div style={{borderTop:"1px solid #1e293b",marginTop:12,paddingTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{color:"#64748b",fontSize:10}}>Your Local Formula Cost/kg</div>
              <div style={{color:"#34d399",fontWeight:900,fontSize:22}}>{fmtCur(customCostINR,currency)}</div>
            </div>
            <div style={{textAlign:"right",color:"#475569",fontSize:10,maxWidth:160}}>
              Add 20–40% for overheads, packaging, profit to get selling price
            </div>
          </div>
        </div>
      )}

      {/* Inner tabs */}
      <div style={{display:"flex",borderBottom:"1px solid #1e293b",marginBottom:12,overflowX:"auto"}}>
        {[
          {id:"formula",l:"📋 Formula"},
          {id:"process",l:"⚙️ Process",lock:!(planKey==="starter"||planKey==="pro"||planKey==="enterprise")},
          {id:"equipment",l:"🏭 Equipment",lock:!(planKey==="starter"||planKey==="pro"||planKey==="enterprise")},
          {id:"engbasic",l:"📐 Basic Eng",lock:!plan.engBasic},
          {id:"engdetailed",l:"🔬 Detailed",lock:!plan.engDetailed},
        ].map(t=>(
          <button key={t.id} onClick={()=>handleTab(t.id)} style={{padding:"6px 10px",border:"none",background:"none",cursor:"pointer",color:tab===t.id?color:"#475569",borderBottom:`2px solid ${tab===t.id?color:"transparent"}`,fontWeight:tab===t.id?700:500,fontSize:10,transition:"all 0.2s",marginBottom:-1,whiteSpace:"nowrap"}}>
            {t.l}{t.lock?" 🔒":""}
          </button>
        ))}
      </div>

      {tab==="formula"&&(
        <div>
          {/* Paywall overlay for locked formulas */}
          {planKey==="free"&&!formula.free&&(
            <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:14,padding:24,marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:10}}>🔒</div>
              <div style={{color:"#f1f5f9",fontWeight:800,fontSize:15,marginBottom:6}}>Full Formula Locked</div>
              <div style={{color:"#64748b",fontSize:12,lineHeight:1.7,marginBottom:16}}>
                Unlock full ingredients, percentages, RM costs and batch calculator for this formula.
              </div>
              <button onClick={()=>window.open(RZP.formula49,"_blank")}
                style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,#34d399,#10b981)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",marginBottom:8}}>
                Unlock this formula — ₹49 →
              </button>
              <button onClick={()=>window.open(RZP.annual,"_blank")}
                style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",marginBottom:8}}>
                All 250+ formulas — ₹3,999/yr →
              </button>
              <div style={{color:"#334155",fontSize:10}}>After payment email info@chemformpro.in with payment ID to activate</div>
            </div>
          )}
          {(planKey==="annual"||formula.free)&&formula.ingredients.map((ing,i)=>{
            const bw=(ing.p/Math.max(...formula.ingredients.map(x=>x.p)))*100;
            const price=Number(rmPrices[ing.n]??ing.c);
            const contrib=(Number(ing.p)/100)*price;
            return(
              <div key={i} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{color:"#cbd5e1",fontSize:12,flex:1,marginRight:8}}>{ing.n}</span>
                  <div style={{display:"flex",gap:8,flexShrink:0}}>
                    <span style={{color:color,fontSize:12,fontWeight:700}}>{ing.p}%</span>
                    <span style={{color:"#475569",fontSize:11,minWidth:65,textAlign:"right"}}>{fmtCur(price,currency)}/kg</span>
                    <span style={{color:"#64748b",fontSize:11,minWidth:60,textAlign:"right"}}>=&nbsp;{fmtCur(contrib,currency)}</span>
                  </div>
                </div>
                <div style={{background:"#1e293b",borderRadius:4,height:4}}>
                  <div style={{width:`${bw}%`,background:`linear-gradient(90deg,${color},${color}55)`,height:4,borderRadius:4,transition:"width 0.6s"}}/>
                </div>
              </div>
            );
          })}

          {(planKey==="annual"||formula.free)&&(()=>{
            const totalPct = formula.ingredients.reduce((s,i)=>s+Number(i.p),0);
            const pctColor = totalPct>105?"#f87171":totalPct>=99?"#34d399":"#e8a838";
            return (
              <>
                <div style={{marginTop:12,display:"flex",gap:7}}>
                  <div style={{flex:1,padding:"10px 14px",background:color+"11",border:`1px solid ${color}33`,borderRadius:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{color:"#64748b",fontSize:12}}>Total RM Cost/kg:</span>
                    <span style={{color:color,fontWeight:900,fontSize:18}}>{fmtCur(customCostINR,currency)}</span>
                  </div>
                  <div style={{padding:"10px 14px",background:pctColor+"11",border:`1px solid ${pctColor}33`,borderRadius:9,textAlign:"center",minWidth:90}}>
                    <div style={{color:pctColor,fontWeight:900,fontSize:18}}>{totalPct.toFixed(1)}%</div>
                    <div style={{color:"#475569",fontSize:9}}>Total %</div>
                  </div>
                </div>
                <InlineAd/>
              </>
            );
          })()}

          {/* Related Formulas */}
          {(()=>{
            const allCatFormulas = Object.values(FORMULAS).flat();
            const related = allCatFormulas
              .filter(f => f.id !== formula.id && (
                f.tags?.some(t => formula.tags?.includes(t)) ||
                Math.abs(f.score - formula.score) < 8
              ))
              .slice(0, 4);
            if(!related.length) return null;
            return (
              <div style={{marginTop:18}}>
                <div style={{color:"#475569",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Related Formulas</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {related.map(rf=>{
                    const rfCost = calcCostPerKg(rf.ingredients);
                    const rfCol = rf.score>=90?"#34d399":rf.score>=80?"#e8a838":"#f87171";
                    return(
                      <div key={rf.id} onClick={()=>{setSelected(rf);setTab("formula");window.scrollTo(0,0);}}
                        style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:"#0a0f1e",borderRadius:10,border:"1px solid #1e293b",cursor:"pointer",transition:"all 0.2s"}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=color}
                        onMouseLeave={e=>e.currentTarget.style.borderColor="#1e293b"}>
                        <div style={{flex:1,marginRight:8}}>
                          <div style={{color:"#f1f5f9",fontSize:12,fontWeight:600}}>{rf.name}</div>
                          <div style={{color:"#475569",fontSize:10,marginTop:2}}>{rf.sub}</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{color:rfCol,fontWeight:700,fontSize:11}}>{rf.score}/100</div>
                          <div style={{color:"#64748b",fontSize:10}}>{fmtCur(rfCost,currency)}/kg</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tab==="process"&&false&&(
        <div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:9}}>Manufacturing Process</div>
          {typeof formula.process === "string" ? (
            <div>
              <div style={{color:"#94a3b8",fontSize:13,lineHeight:1.8,padding:"14px 16px",background:"#0a0f1e",borderRadius:12,border:"1px solid #1e293b",marginBottom:12}}>{formula.process}</div>
              <div style={{background:color+"11",border:`1px solid ${color}33`,borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                <div>
                  <div style={{color:color,fontWeight:700,fontSize:12}}>📄 Process Flow Diagram & Detailed SOP</div>
                  <div style={{color:"#475569",fontSize:11,marginTop:2}}>Get the complete PFD, equipment sizing, and step-by-step manufacturing SOP</div>
                </div>
                <button onClick={()=>alert("Quote request sent! Our engineering team will contact you within 24 hours with the Process Flow Diagram.")} style={{background:color,border:"none",color:"#fff",fontWeight:700,fontSize:11,padding:"7px 14px",borderRadius:8,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Request PFD →</button>
              </div>
            </div>
          ) : (
            formula.process?.map((step,i)=>(
              <div key={i} style={{display:"flex",gap:9,marginBottom:8,padding:"9px 12px",background:"#0a0f1e",borderRadius:10,border:"1px solid #1e293b"}}>
                <div style={{width:19,height:19,borderRadius:"50%",background:color+"22",border:`1px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",color,fontSize:9,fontWeight:800,flexShrink:0}}>{i+1}</div>
                <div style={{color:"#94a3b8",fontSize:12,lineHeight:1.6}}>{step}</div>
              </div>
            ))
          )}
        </div>
      )}
      {tab==="equipment"&&(planKey==="starter"||planKey==="pro"||planKey==="enterprise")&&(
        <div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:9}}>Equipment Required</div>
          {formula.equipment?.map((eq,i)=>(
            <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:7,padding:"8px 11px",background:"#0a0f1e",borderRadius:9,border:"1px solid #1e293b"}}>
              <span style={{fontSize:13}}>🔧</span><span style={{color:"#cbd5e1",fontSize:12}}>{eq}</span>
            </div>
          ))}
          <div style={{marginTop:12,background:"#4f9cf911",border:"1px solid #4f9cf922",borderRadius:11,padding:12}}>
            <div style={{color:"#4f9cf9",fontWeight:700,fontSize:12,marginBottom:7}}>📐 General Sizing Rules</div>
            <div style={{color:"#64748b",fontSize:11,lineHeight:1.8}}>
              • Mixer volume = batch size × 1.25 (80% fill factor)<br/>
              • Ribbon blender: ~1.5 kW / 100 L, throughput 8–10 batches/shift<br/>
              • Disperser (Cowles): ~3 kW / 50 L at 2000 rpm<br/>
              • Bagging machine: 600–1200 bags/h (25 kg bags)<br/>
              • Sieve area: 1 m² per 2 T/h throughput
            </div>
          </div>
        </div>
      )}
      {tab==="engbasic"&&plan.engBasic&&(
        <div style={{background:"#4f9cf911",border:"1px solid #4f9cf922",borderRadius:12,padding:14}}>
          <div style={{color:"#4f9cf9",fontWeight:700,fontSize:13,marginBottom:9}}>📄 Basic Engineering Package</div>
          {["Process Flow Diagram (PFD)","Equipment list with capacities","Utility requirements (power, water, air)","Site area & plot plan estimation","Capital cost estimate ±30%","Operating cost model"].map(item=>(
            <div key={item} style={{color:"#94a3b8",fontSize:11,marginBottom:5,display:"flex",gap:5}}><span style={{color:"#4f9cf9"}}>→</span>{item}</div>
          ))}
          <button onClick={()=>alert("Quote request sent! Our team will contact you within 24 hours.")} style={{marginTop:10,width:"100%",padding:"9px",borderRadius:9,background:"linear-gradient(135deg,#4f9cf9,#0ea5e9)",border:"none",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>📧 Request Quote for Basic Engineering</button>
        </div>
      )}
      {tab==="engdetailed"&&plan.engDetailed&&(
        <div style={{background:"#a78bfa11",border:"1px solid #a78bfa22",borderRadius:12,padding:14}}>
          <div style={{color:"#a78bfa",fontWeight:700,fontSize:13,marginBottom:9}}>🔬 Detailed Engineering Package</div>
          {["P&ID (Piping & Instrumentation Diagram)","Equipment datasheets & specifications","Electrical single-line diagram","Civil/structural design basis","HAZOP study report","Procurement specifications","Commissioning & startup procedures"].map(item=>(
            <div key={item} style={{color:"#94a3b8",fontSize:11,marginBottom:5,display:"flex",gap:5}}><span style={{color:"#a78bfa"}}>→</span>{item}</div>
          ))}
          <button onClick={()=>alert("Detailed engineering quote sent! Team will contact you within 48 hours.")} style={{marginTop:10,width:"100%",padding:"9px",borderRadius:9,background:"linear-gradient(135deg,#a78bfa,#8b5cf6)",border:"none",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>📧 Request Detailed Engineering Quote</button>
        </div>
      )}
    </div>
  );
}

function AIOptimizer({formula, planKey, currency, usage, onUseQuota, onUpgrade}){
  const [goal,setGoal]=useState("balanced");
  const [targetCost,setTargetCost]=useState("");
  const [targetPerf,setTargetPerf]=useState("90");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState(null);
  const plan=PLANS[planKey];

  useEffect(()=>{
    setResult(null); setError(null);
    if(formula) setTargetCost((formula.ingredients.reduce((t,i)=>(t+(i.p/100)*i.c),0)*0.85).toFixed(0));
  },[formula?.id]);

  const cat=CATEGORIES.find(c=>FORMULAS[c.id]?.some(f=>f.id===formula?.id));
  const color=cat?.color||"#4f9cf9";
  const creditsLeft=Math.max(0,plan.ai-usage.ai);

  const run=async()=>{
    if(!formula) return;
    if(creditsLeft<=0){ onUpgrade("More AI Optimizations"); return; }
    setLoading(true); setResult(null); setError(null);

    const currentCost=formula.ingredients.reduce((t,i)=>(t+(i.p/100)*i.c),0);
    const ingredientsList=formula.ingredients.map(i=>`- ${i.n}: ${i.p}% at ₹${i.c}/kg (contribution: ₹${((i.p/100)*i.c).toFixed(2)}/kg)`).join("\n");
    const goalText=goal==="cost"
      ?`COST REDUCTION ONLY: Reduce raw material cost from ₹${currentCost.toFixed(2)}/kg to approximately ₹${targetCost}/kg. Suggest cheaper alternatives, reduce expensive ingredient percentages. Maintain minimum acceptable performance.`
      :goal==="performance"
      ?`MAXIMUM PERFORMANCE ONLY: Ignore cost completely. Your single goal is to maximise product performance, quality, durability and functional properties. Increase high-performance ingredients. Suggest premium alternatives even if more expensive. Do NOT reduce any ingredient for cost reasons. Do NOT mention savings. Only add or increase ingredients that boost performance.`
      :`BALANCED: Improve performance where possible while also reducing cost. Find the best trade-off.`;

    const prompt=`You are a senior expert formulation chemist with 25+ years experience. You must follow the optimization goal STRICTLY.

Formula: ${formula.name} (${formula.sub})
Current raw material cost: ₹${currentCost.toFixed(2)}/kg
Current performance score: ${formula.score}/100

Ingredients (name | % by weight | ₹/kg | cost contribution ₹/kg of formula):
${ingredientsList}

OPTIMIZATION GOAL — READ CAREFULLY AND FOLLOW EXACTLY:
${goalText}

Rules:
- For COST goal: reduce expensive ingredients, find cheaper substitutes, do not mention performance gains as primary objective
- For PERFORMANCE goal: ONLY increase quality-driving ingredients. NEVER reduce a functional ingredient to save cost. You may suggest adding new premium ingredients not in the list. The estimated_cost_inr will likely be HIGHER than current — that is correct and expected for max performance.
- For BALANCED goal: find genuine trade-offs

Formula cost/kg = SUM of (percentage/100 × price/kg) for each ingredient. Recalculate estimated_cost_inr correctly.

Respond ONLY with valid JSON (no markdown, no text outside):
{"summary":"2-3 sentences explaining WHAT you changed and WHY, specific to the goal","optimized_ingredients":[{"name":"exact ingredient name from the list above","original_pct":0.0,"new_pct":0.0,"change":"increase|decrease|unchanged|new","reason":"specific technical reason for this change"}],"estimated_cost_inr":0.0,"estimated_performance":0,"cost_savings_pct":0.0,"key_changes":["specific change 1","specific change 2"],"warnings":["any formulation risks or constraints"]}`;

    try{
      const res=await fetch("https://nameless-heart-9c9c.vaanienterprises2411.workers.dev/",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1500,messages:[{role:"user",content:prompt}]})
      });
      if(!res.ok){
        const e=await res.json().catch(()=>({}));
        throw new Error(`API ${res.status}: ${e.error?.message||res.statusText}`);
      }
      const data=await res.json();
      const text=(data.content||[]).map(c=>c.type==="text"?c.text:"").join("").trim();
      // Clean any accidental markdown
      const clean=text.replace(/^```(?:json)?\s*/im,"").replace(/\s*```\s*$/im,"").trim();
      const parsed=JSON.parse(clean);
      setResult(parsed);
      onUseQuota("ai");
    }catch(e){
      setError(e.message||"Optimization failed. Please try again.");
    }
    setLoading(false);
  };

  if(!formula) return(
    <div style={{textAlign:"center",padding:"50px 20px",color:"#475569"}}>
      <div style={{fontSize:38,marginBottom:10}}>🤖</div>
      <div style={{fontSize:14,fontWeight:600}}>Select a formula to optimize</div>
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div><div style={{color:"#f1f5f9",fontSize:17,fontWeight:800}}>AI Optimizer</div><div style={{color:"#64748b",fontSize:11}}>{formula.name}</div></div>
        <QBadge used={usage.ai} limit={plan.ai} label="AI left" color={color}/>
      </div>

      {creditsLeft===0&&(
        <div style={{background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{color:"#64748b",fontSize:12}}>Monthly AI credits used up</span>
            <button onClick={()=>onUpgrade("More AI Optimizations")} style={{background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",color:"#fff",fontSize:11,fontWeight:700,padding:"5px 12px",borderRadius:6,cursor:"pointer"}}>Upgrade</button>
          </div>
          <button onClick={()=>window.open(RZP.ai99,"_blank")}
            style={{width:"100%",padding:"9px",borderRadius:9,border:"1px solid #4f9cf944",background:"#4f9cf911",color:"#4f9cf9",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            🤖 Buy 1 AI Credit — ₹99 →
          </button>
          <button onClick={()=>window.open(RZP.ai799,"_blank")}
            style={{width:"100%",padding:"9px",borderRadius:9,border:"1px solid #34d39944",background:"#34d39911",color:"#34d399",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:6}}>
            ⚡ Buy 10 AI Credits — ₹799 →
          </button>
        </div>
      )}

      <div style={{marginBottom:12}}>
        <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:7}}>Optimization Goal</div>
        <div style={{display:"flex",gap:7,flexDirection:"column"}}>
          {[
            {id:"cost",      l:"💰 Reduce Cost",    d:"Lower RM cost. Quality maintained at minimum acceptable level."},
            {id:"performance",l:"⚡ Max Performance", d:"Best possible quality. Cost IGNORED — expect higher cost output."},
            {id:"balanced",  l:"⚖️ Balanced",        d:"Best cost-quality trade-off. Moderate improvements in both."},
          ].map(g=>(
            <div key={g.id} onClick={()=>setGoal(g.id)} style={{padding:"9px 12px",borderRadius:9,cursor:"pointer",border:`1px solid ${goal===g.id?color:"#1e293b"}`,background:goal===g.id?color+"15":"#0a0f1e",transition:"all 0.2s",display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:13,fontWeight:800,color:goal===g.id?color:"#64748b",flexShrink:0}}>{g.l}</div>
              <div style={{fontSize:10,color:"#475569",lineHeight:1.3}}>{g.d}</div>
              {goal===g.id&&<div style={{marginLeft:"auto",color,fontSize:14,flexShrink:0}}>✓</div>}
            </div>
          ))}
        </div>
      </div>

      {goal==="cost"&&(
        <div style={{marginBottom:12}}>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Target Cost (₹/kg)</div>
          <input type="number" value={targetCost} onChange={e=>setTargetCost(e.target.value)}
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:8,padding:"9px 12px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
      )}
      {goal==="performance"&&(
        <div style={{marginBottom:12}}>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Target Score (0–100)</div>
          <input type="number" min="0" max="100" value={targetPerf} onChange={e=>setTargetPerf(e.target.value)}
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:8,padding:"9px 12px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
      )}

      {creditsLeft>0&&creditsLeft<=2&&(
        <div style={{background:"#e8a83811",border:"1px solid #e8a83833",borderRadius:9,padding:"7px 11px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{color:"#e8a838",fontSize:11}}>⚠️ Only {creditsLeft} AI credit{creditsLeft===1?"":"s"} left</span>
          <button onClick={()=>onUpgrade("More AI Credits")} style={{background:"none",border:"none",color:"#4f9cf9",fontSize:11,fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>Upgrade →</button>
        </div>
      )}
      <button onClick={run} disabled={loading||creditsLeft===0} style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:loading||creditsLeft===0?"#1e293b":`linear-gradient(135deg,${color},${color}aa)`,color:loading||creditsLeft===0?"#475569":"#fff",fontWeight:800,fontSize:13,cursor:loading||creditsLeft===0?"not-allowed":"pointer",marginBottom:12}}>
        {loading?"🤖 Analyzing...":creditsLeft===0?"No credits — upgrade to continue":"✨ Optimize with AI"}
      </button>

      {error&&<div style={{color:"#f87171",fontSize:12,padding:"10px",background:"#f8717111",borderRadius:8,marginBottom:10}}>⚠️ {error}</div>}

      {result&&(
        <div style={{animation:"fadeIn 0.4s ease"}}>
          <div style={{background:color+"11",border:`1px solid ${color}33`,borderRadius:11,padding:12,marginBottom:11}}>
            <div style={{color:color,fontWeight:700,fontSize:11,marginBottom:4}}>AI Analysis</div>
            <div style={{color:"#cbd5e1",fontSize:12,lineHeight:1.6}}>{result.summary}</div>
          </div>
          <div style={{display:"flex",gap:7,marginBottom:11}}>
            {[
              {l:"New Cost/kg",v:fmtCur(result.estimated_cost_inr||0,currency),g:(result.estimated_cost_inr||0)<formula.ingredients.reduce((t,i)=>t+(i.p/100)*i.c,0)},
              {l:"Performance",v:`${result.estimated_performance||0}/100`,g:(result.estimated_performance||0)>=formula.score},
              {l:"Cost Saving",v:`${Number(result.cost_savings_pct||0).toFixed(1)}%`,g:(result.cost_savings_pct||0)>0}
            ].map(m=>(
              <div key={m.l} style={{flex:1,background:"#0a0f1e",border:`1px solid ${m.g?"#34d39944":"#f8717144"}`,borderRadius:9,padding:"7px 8px",textAlign:"center"}}>
                <div style={{color:m.g?"#34d399":"#f87171",fontWeight:800,fontSize:12}}>{m.v}</div>
                <div style={{color:"#475569",fontSize:9}}>{m.l}</div>
              </div>
            ))}
          </div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:7}}>Suggested Changes</div>
          {(result.optimized_ingredients||[]).map((ing,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",background:"#0a0f1e",borderRadius:8,marginBottom:4,border:`1px solid ${ing.change==="increase"?"#34d39933":ing.change==="decrease"?"#f8717133":"#1e293b"}`}}>
              <div style={{flex:1,marginRight:8}}>
                <div style={{color:"#cbd5e1",fontSize:11}}>{ing.name}</div>
                <div style={{color:"#475569",fontSize:9,lineHeight:1.3}}>{ing.reason}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{color:"#64748b",fontSize:9}}>{ing.original_pct}%</div>
                <div style={{color:ing.change==="increase"?"#34d399":ing.change==="decrease"?"#f87171":"#94a3b8",fontWeight:700,fontSize:12}}>{ing.new_pct}%</div>
              </div>
            </div>
          ))}
          {(result.warnings||[]).filter(Boolean).length>0&&(
            <div style={{marginTop:10,background:"#e8a83811",border:"1px solid #e8a83844",borderRadius:9,padding:11}}>
              <div style={{color:"#e8a838",fontWeight:700,fontSize:11,marginBottom:4}}>⚠️ Warnings</div>
              {result.warnings.filter(Boolean).map((w,i)=><div key={i} style={{color:"#fbbf24",fontSize:11}}>• {w}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BatchCalc({formula, currency}){
  const [size,setSize]=useState("100");
  const [unit,setUnit]=useState("kg");
  const [rmPrices,setRmPrices]=useState({});

  useEffect(()=>{
    if(formula){ const d={}; formula.ingredients.forEach(i=>{d[i.n]=i.c;}); setRmPrices(d); }
  },[formula?.id]);

  const cat=CATEGORIES.find(c=>FORMULAS[c.id]?.some(f=>f.id===formula?.id));
  const color=cat?.color||"#4f9cf9";

  if(!formula) return(
    <div style={{textAlign:"center",padding:"50px 20px",color:"#475569"}}>
      <div style={{fontSize:38,marginBottom:10}}>⚖️</div>
      <div style={{fontSize:14,fontWeight:600}}>Select a formula</div>
    </div>
  );

  const sz=parseFloat(size)||0;
  // CORRECT: formula cost per kg = sum(p/100 * price)
  const costPerKgINR=formula.ingredients.reduce((total,ing)=>{
    const price=Number(rmPrices[ing.n]??ing.c);
    return total+(Number(ing.p)/100)*price;
  },0);
  const totalCostINR=sz*costPerKgINR;

  return(
    <div>
      <div style={{color:"#f1f5f9",fontSize:17,fontWeight:800,marginBottom:3}}>Batch Calculator</div>
      <div style={{color:"#64748b",fontSize:11,marginBottom:14}}>{formula.name}</div>

      <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:10,padding:12,marginBottom:12}}>
        <div style={{color:"#475569",fontSize:10,fontWeight:700,marginBottom:8}}>ENTER YOUR LOCAL RM PRICES (₹/kg)</div>
        {formula.ingredients.map(ing=>(
          <div key={ing.n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{color:"#94a3b8",fontSize:11,flex:1,marginRight:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ing.n} <span style={{color:"#334155"}}>({ing.p}%)</span></span>
            <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
              <span style={{color:"#334155",fontSize:10}}>₹</span>
              <input type="number" step="0.01" min="0" value={Number(rmPrices[ing.n]??ing.c)}
                onChange={e=>setRmPrices(p=>({...p,[ing.n]:parseFloat(e.target.value)||0}))}
                style={{width:64,background:"#060b14",border:"1px solid #1e293b",borderRadius:5,padding:"4px 6px",color:"#f1f5f9",fontSize:11,outline:"none",textAlign:"right"}}/>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:9,marginBottom:12}}>
        <div style={{flex:1}}>
          <div style={{color:"#94a3b8",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Batch Size</div>
          <input value={size} onChange={e=>setSize(e.target.value)} type="number"
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:7,padding:"8px 11px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{color:"#94a3b8",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Unit</div>
          <select value={unit} onChange={e=>setUnit(e.target.value)}
            style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:7,padding:"8px 11px",color:"#f1f5f9",fontSize:13,outline:"none"}}>
            {["kg","g","lbs","MT"].map(u=><option key={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div style={{background:`linear-gradient(135deg,${color}22,${color}08)`,border:`1px solid ${color}44`,borderRadius:11,padding:13,marginBottom:12,textAlign:"center"}}>
        <div style={{color:"#64748b",fontSize:11}}>Total Raw Material Cost</div>
        <div style={{color:color,fontSize:28,fontWeight:900}}>{fmtCur(totalCostINR,currency)}</div>
        <div style={{color:"#64748b",fontSize:10}}>{fmtCur(costPerKgINR,currency)}/kg × {sz} {unit}</div>
      </div>

      <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Ingredient Breakdown</div>
      {formula.ingredients.map((ing,i)=>{
        const price=Number(rmPrices[ing.n]??ing.c);
        const qty=(Number(ing.p)/100)*sz;
        const ingCostINR=qty*price;
        return(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 11px",background:"#0a0f1e",borderRadius:7,marginBottom:5,border:"1px solid #1e293b"}}>
            <div style={{minWidth:0,flex:1,marginRight:8}}>
              <div style={{color:"#cbd5e1",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ing.n}</div>
              <div style={{color:"#475569",fontSize:9}}>{ing.p}% of batch</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{color:color,fontWeight:700,fontSize:12}}>{qty.toFixed(3)} {unit}</div>
              <div style={{color:"#475569",fontSize:10}}>{fmtCur(ingCostINR,currency)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RequestFormula({user, planKey, currency, onUpgrade}){
  const isFree    = planKey === "free";
  const isStarter = planKey === "starter";
  const isPaid    = planKey === "pro" || planKey === "enterprise"; // these get it free
  // Pricing for pay-per-request
  const REQ_PRICE_INR = 499;
  const REQ_PRICE_USD = 6;
  const priceStr = currency === "INR" ? `₹${REQ_PRICE_INR}` : `$${REQ_PRICE_USD}`;

  const [form,setForm]=useState({name:"",category:"",application:"",requirements:"",email:user?.contact||""});
  const [payStep,setPayStep]=useState("form"); // form | payment | processing | done
  const [countdown,setCountdown]=useState(0);

  const cats=["Drymix / Construction Chemicals","Paints & Coatings","Adhesives & Sealants","Cosmetics / Personal Care","Homecare / Cleaners","Inks","Textile Sizing","Paper Sizing","Chemical Manufacturing","Other"];

  const canFormFill = !!(form.name && form.category && form.application && form.email);

  // Payment countdown effect
  useEffect(()=>{
    if(payStep==="processing"){
      setCountdown(3);
      const t=setInterval(()=>setCountdown(c=>{
        if(c<=1){clearInterval(t);setPayStep("done");return 0;}
        return c-1;
      }),1000);
      return()=>clearInterval(t);
    }
  },[payStep]);

  const handleSubmit=()=>{
    if(!canFormFill) return;
    if(isPaid){
      // Pro/Enterprise — open Google Form directly, free
      const base="https://docs.google.com/forms/d/e/1FAIpQLScgoC0zigEeu7onY8n-wZM0KjMQ_cNgM6VvlHxyF7ZA74w6lg/viewform";
      const params=new URLSearchParams({
        "entry.2005620554":form.name,"entry.1065046570":form.category,
        "entry.1045781291":form.application,"entry.1166974658":form.requirements||"",
        "entry.839337160":form.email||(user?.email||""),
      });
      window.open(base+"?usp=pp_url&"+params.toString(),"_blank");
      setPayStep("done");
      return;
    }
    // Free/Starter — show payment step first
    setPayStep("payment");
  };

  if(payStep==="done") return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 24px",textAlign:"center",flex:1}}>
      <div style={{fontSize:52,marginBottom:14}}>✅</div>
      <div style={{color:"#34d399",fontWeight:900,fontSize:20,marginBottom:8}}>Request Confirmed!</div>
      <div style={{color:"#64748b",fontSize:14,lineHeight:1.8,maxWidth:420}}>
        {!isPaid&&<div style={{color:"#34d399",fontSize:13,fontWeight:700,marginBottom:10}}>Payment of {priceStr} received ✓</div>}
        Our expert formulation team will prepare a complete formulation for<br/>
        <strong style={{color:"#f1f5f9"}}>{form.name}</strong><br/>
        and email it to <strong style={{color:"#f1f5f9"}}>{form.email}</strong> within{" "}
        <strong style={{color:"#34d399"}}>24 hours</strong>.<br/><br/>
        The formulation will also be added to ChemForm Pro for all users.
      </div>
      <button onClick={()=>{setPayStep("form");setForm(f=>({...f,name:"",category:"",application:"",requirements:""}));}}
        style={{marginTop:22,background:"#1e293b",border:"none",color:"#94a3b8",fontWeight:700,fontSize:13,padding:"10px 24px",borderRadius:10,cursor:"pointer"}}>
        Submit Another Request
      </button>
    </div>
  );

  if(payStep==="payment"||payStep==="processing") return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",textAlign:"center",flex:1}}>
      <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:20,padding:28,maxWidth:380,width:"100%"}}>
        {payStep==="payment"&&<>
          <div style={{fontSize:36,marginBottom:10}}>💳</div>
          <div style={{color:"#f1f5f9",fontWeight:900,fontSize:17,marginBottom:4}}>Pay to Submit Request</div>
          <div style={{color:"#64748b",fontSize:13,marginBottom:6}}>Custom formulation for:</div>
          <div style={{color:"#f59e0b",fontWeight:700,fontSize:14,marginBottom:12}}>"{form.name}"</div>
          <div style={{color:"#f1f5f9",fontWeight:900,fontSize:30,marginBottom:2}}>₹499</div>
          <div style={{color:"#475569",fontSize:12,marginBottom:16}}>one-time · response within 24h</div>
          <div style={{background:"#f59e0b11",border:"1px solid #f59e0b33",borderRadius:12,padding:12,marginBottom:16,textAlign:"left"}}>
            {["Complete formulation with ingredient %","RM costs in INR/kg","Manufacturing process overview","Added to ChemForm Pro library"].map(i=>(
              <div key={i} style={{color:"#94a3b8",fontSize:11,marginBottom:3,display:"flex",gap:6}}><span style={{color:"#f59e0b"}}>✓</span>{i}</div>
            ))}
          </div>
          <button onClick={()=>{window.open("https://rzp.io/rzp/hZ9G7udc","_blank");setPayStep("verify");}}
            style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:11,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",marginBottom:8}}>
            Pay ₹499 via Razorpay →
          </button>
          <button onClick={()=>setPayStep("form")} style={{width:"100%",padding:"10px",background:"transparent",border:"1px solid #1e293b",borderRadius:10,color:"#475569",fontSize:12,cursor:"pointer"}}>← Back</button>
          <div style={{color:"#334155",fontSize:10,marginTop:10}}>🔒 UPI · Cards · Net Banking · Secure</div>

          {/* Upgrade nudge */}
          <div style={{borderTop:"1px solid #1e293b",marginTop:16,paddingTop:14}}>
            <div style={{color:"#475569",fontSize:11,marginBottom:8}}>Or get unlimited free requests with</div>
            <button onClick={()=>{setPayStep("form");onUpgrade("Unlimited formula requests included in Pro & Enterprise");}}
              style={{width:"100%",padding:"9px",background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",color:"#fff",fontWeight:700,fontSize:12,borderRadius:9,cursor:"pointer"}}>
              ✨ Upgrade to Pro — ₹2,399/mo → Unlimited requests
            </button>
          </div>
        </>}
        {payStep==="verify"&&<>
          <div style={{fontSize:44,marginBottom:14}}>🔗</div>
          <div style={{color:"#f1f5f9",fontWeight:800,fontSize:16,marginBottom:8}}>Payment Complete?</div>
          <div style={{color:"#64748b",fontSize:12,lineHeight:1.7,marginBottom:14}}>
            After paying on Razorpay, enter your Payment ID from the confirmation SMS/email, then we'll open the Google Form for your request details.
          </div>
          <div style={{textAlign:"left",marginBottom:10}}>
            <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,letterSpacing:"0.08em",marginBottom:6,textTransform:"uppercase"}}>Razorpay Payment ID *</div>
            <input
              onChange={e=>window._reqTxnId=e.target.value}
              placeholder="pay_xxxxxxxxxxxxxxxxx"
              style={{width:"100%",background:"#060b14",border:"1px solid #334155",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            <div style={{color:"#334155",fontSize:10,marginTop:4}}>From Razorpay confirmation SMS or email</div>
          </div>
          <button onClick={()=>{
            const txn=(window._reqTxnId||"").trim();
            if(!txn||txn.length<6){alert("Please enter your Razorpay Payment ID from the confirmation SMS/email");return;}
            const base="https://docs.google.com/forms/d/e/1FAIpQLScgoC0zigEeu7onY8n-wZM0KjMQ_cNgM6VvlHxyF7ZA74w6lg/viewform";
            const params=new URLSearchParams({
              "entry.2005620554":form.name,"entry.1065046570":form.category,
              "entry.1045781291":form.application,"entry.1166974658":form.requirements||"",
              "entry.839337160":form.email,
            });
            window.open(base+"?usp=pp_url&"+params.toString(),"_blank");
            setPayStep("done");
          }} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#34d399,#10b981)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",marginBottom:8}}>
            ✅ Verify & Open Google Form
          </button>
          <button onClick={()=>window.open("https://rzp.io/rzp/hZ9G7udc","_blank")}
            style={{width:"100%",padding:"9px",background:"transparent",border:"1px solid #1e293b",borderRadius:10,color:"#475569",fontSize:12,cursor:"pointer",marginBottom:6}}>
            🔗 Reopen Payment Link
          </button>
          <div style={{color:"#334155",fontSize:10}}>Payment ID not received? Email <a href="mailto:info@chemformpro.in" style={{color:"#4f9cf9",textDecoration:"none"}}>info@chemformpro.in</a></div>
        </>}
        {payStep==="processing"&&<>
          <div style={{fontSize:36,marginBottom:14}}>⏳</div>
          <div style={{color:"#f1f5f9",fontWeight:700,fontSize:15,marginBottom:6}}>Processing payment...</div>
          <div style={{color:"#475569",fontSize:12,marginBottom:20}}>Please wait, do not close this window</div>
          <div style={{background:"#1e293b",borderRadius:99,height:5,overflow:"hidden"}}>
            <div style={{height:5,background:"linear-gradient(90deg,#f59e0b,#d97706)",borderRadius:99,animation:"progressBar 3s ease-in-out forwards"}}/>
          </div>
          <style>{`@keyframes progressBar{from{width:0%}to{width:100%}}`}</style>
        </>}
      </div>
    </div>
  );

  return(
    <div style={{maxWidth:600,margin:"0 auto",padding:"20px 16px"}}>

      {/* Access tier banner */}
      {isPaid?(
        <div style={{background:"#34d39911",border:"1px solid #34d39933",borderRadius:12,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>🎁</span>
          <div>
            <div style={{color:"#34d399",fontWeight:700,fontSize:13}}>Included in your {PLANS[planKey].name} plan</div>
            <div style={{color:"#475569",fontSize:11}}>Custom formulation requests are free for Pro & Enterprise users — unlimited.</div>
          </div>
        </div>
      ):(
        <div style={{background:"#f59e0b11",border:"1px solid #f59e0b33",borderRadius:12,padding:"12px 16px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
            <div>
              <div style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>Custom Formulation Request — {priceStr} per request</div>
              <div style={{color:"#475569",fontSize:11,marginTop:3}}>Free plan & Starter users pay {priceStr} per custom request. Pro & Enterprise get unlimited requests included.</div>
            </div>
            <button onClick={()=>onUpgrade("Unlimited custom formula requests (Pro & Enterprise)")}
              style={{background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",color:"#fff",fontSize:10,fontWeight:700,padding:"5px 12px",borderRadius:7,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
              Upgrade for Free
            </button>
          </div>
          {/* Per-request value breakdown */}
          <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
            {["Complete formulation","RM cost breakdown","Process overview","Added to app library"].map(v=>(
              <div key={v} style={{background:"#f59e0b22",borderRadius:6,padding:"3px 8px",color:"#f59e0b",fontSize:10,fontWeight:600}}>✓ {v}</div>
            ))}
          </div>
        </div>
      )}

      <div style={{textAlign:"center",marginBottom:22}}>
        <div style={{fontSize:32,marginBottom:6}}>📩</div>
        <div style={{color:"#f1f5f9",fontWeight:900,fontSize:19,marginBottom:5}}>Request a Custom Formulation</div>
        <div style={{color:"#64748b",fontSize:13,lineHeight:1.6}}>Can't find the formulation you need? Tell us exactly what you're looking for and our expert team will prepare it within 24 hours.</div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:13}}>
        <div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Formulation Name / Product *</div>
          <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
            placeholder="e.g. Waterproof tile adhesive for swimming pools"
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Category *</div>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:9,padding:"10px 14px",color:form.category?"#f1f5f9":"#475569",fontSize:13,outline:"none"}}>
            <option value="">Select category...</option>
            {cats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Application / End Use *</div>
          <input value={form.application} onChange={e=>setForm(f=>({...f,application:e.target.value}))}
            placeholder="e.g. Bonding ceramic tiles in wet areas, outdoor use"
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Performance Requirements & Target Cost <span style={{color:"#334155",fontWeight:400,textTransform:"none"}}>(recommended)</span></div>
          <textarea value={form.requirements} onChange={e=>setForm(f=>({...f,requirements:e.target.value}))}
            placeholder="e.g. Bond strength >1.5 MPa, waterproof, target cost ₹25/kg, IS:15477 C2TE compliant, no toxic raw materials..."
            rows={3} style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",resize:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{color:"#94a3b8",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Email to receive formulation *</div>
          <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
            placeholder="your@email.com"
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:9,padding:"10px 14px",color:"#f1f5f9",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>

        {/* Submit button — changes label based on plan */}
        <button onClick={handleSubmit} disabled={!canFormFill}
          style={{padding:"14px",borderRadius:11,border:"none",
            background:!canFormFill?"#1e293b":isPaid?"linear-gradient(135deg,#34d399,#10b981)":"linear-gradient(135deg,#f59e0b,#d97706)",
            color:!canFormFill?"#475569":"#fff",fontWeight:800,fontSize:15,
            cursor:!canFormFill?"not-allowed":"pointer"}}>
          {!canFormFill
            ? "Fill all required fields to continue"
            : isPaid
            ? "📩 Submit Request — Free (included in your plan)"
            : `📩 Submit & Pay ${priceStr} →`}
        </button>

        <div style={{textAlign:"center",color:"#334155",fontSize:11}}>
          {isPaid
            ? "Unlimited requests included · Response within 24h · Formula added to ChemForm Pro"
            : `${priceStr} one-time · Response within 24h · Formula added to app for all users`}
        </div>
      </div>
    </div>
  );
}

function PharmaPanel({planKey, currency, onUpgrade}){
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("All");
  const isPaid = planKey==="pro"||planKey==="enterprise"||planKey==="starter";

  const compounds = FORMULAS.pharma||[];
  const categories = ["All","ANTIVIRAL","ANTICANCER","CARDIOVASCULAR","CNS / NEUROLOGICAL","ANTIBIOTIC / ANTIMICROBIAL","ANTI-INFLAMMATORY / ANALGESIC","RESPIRATORY","DIABETES / METABOLIC","DERMATOLOGY","HORMONAL / ENDOCRINE","ANTIHISTAMINE / ALLERGY","GI / GASTROENTEROLOGY","LIPID LOWERING","UROLOGY","BONE / OSTEOPOROSIS","MIGRAINE","VITAMINS / SUPPLEMENTS"];

  const filtered = compounds.filter(f=>{
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filter==="All" || f.tags.includes(filter);
    return matchSearch && matchCat;
  });

  const handleSelect = (f) => {
    if(!isPaid && !f.free){ onUpgrade("Pharma API Formulations (Starter+)"); return; }
    setSelected(f);
  };

  const handleRequestQuote = () => {
    alert("Quote request sent! Our pharmaceutical team will contact you within 24 hours with the complete technical package including synthesis route, specifications, and regulatory documentation.");
  };

  return(
    <div style={{display:"flex",flex:1,minHeight:0,overflow:"hidden"}}>
      {/* Left list */}
      <div style={{width:260,borderRight:"1px solid #1e293b",overflowY:"auto",padding:10,flexShrink:0,display:"flex",flexDirection:"column"}}>
        <div style={{color:"#e879f9",fontWeight:800,fontSize:12,marginBottom:2}}>💊 Pharma API</div>
        <div style={{color:"#475569",fontSize:9,marginBottom:8}}>{compounds.length} Active Pharmaceutical Ingredients</div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search API..."
          style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:7,padding:"7px 10px",color:"#f1f5f9",fontSize:11,outline:"none",marginBottom:8}}/>
        <select value={filter} onChange={e=>setFilter(e.target.value)}
          style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:7,padding:"7px 10px",color:filter==="All"?"#64748b":"#e879f9",fontSize:10,outline:"none",marginBottom:8}}>
          {categories.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        {!isPaid&&(
          <div style={{background:"#e879f911",border:"1px solid #e879f922",borderRadius:7,padding:"6px 9px",marginBottom:8,fontSize:10,color:"#64748b"}}>
            🔒 {compounds.filter(f=>!f.free).length} compounds locked · <span onClick={()=>onUpgrade("Pharma API Library")} style={{color:"#e879f9",cursor:"pointer",fontWeight:700}}>Unlock all</span>
          </div>
        )}
        <div style={{flex:1,overflowY:"auto"}}>
          {filtered.map(f=>{
            const locked=!isPaid&&!f.free;
            return(
              <div key={f.id} onClick={()=>handleSelect(f)} style={{background:selected?.id===f.id?"#1a0a2e":"#0a0f1e",border:`1px solid ${selected?.id===f.id?"#e879f9":"#1e293b"}`,borderRadius:10,padding:"9px 10px",cursor:"pointer",marginBottom:5,opacity:locked?0.5:1,transition:"all 0.2s"}}>
                <div style={{color:"#f1f5f9",fontWeight:700,fontSize:11,marginBottom:2}}>{locked?"🔒 ":""}{f.name}</div>
                <div style={{color:"#475569",fontSize:9,lineHeight:1.3}}>{f.sub}</div>
                <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
                  {f.tags.slice(0,1).map(t=><span key={t} style={{background:"#e879f922",color:"#e879f9",border:"1px solid #e879f944",borderRadius:99,fontSize:8,fontWeight:700,padding:"1px 6px",letterSpacing:"0.05em",textTransform:"uppercase"}}>{t}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right detail */}
      <div style={{flex:1,overflowY:"auto",padding:20}}>
        {!selected&&(
          <div style={{textAlign:"center",padding:"60px 20px",color:"#475569"}}>
            <div style={{fontSize:44,marginBottom:12}}>💊</div>
            <div style={{fontSize:15,fontWeight:700,color:"#64748b"}}>Select an API compound</div>
            <div style={{fontSize:11,marginTop:5,color:"#334155"}}>{compounds.length} Active Pharmaceutical Ingredients</div>
          </div>
        )}
        {selected&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{color:"#f1f5f9",fontSize:18,fontWeight:800,lineHeight:1.2}}>{selected.name}</div>
                <div style={{color:"#e879f9",fontSize:12,fontWeight:700,marginTop:3}}>{selected.sub}</div>
                <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
                  {selected.tags.map(t=><span key={t} style={{background:"#e879f922",color:"#e879f9",border:"1px solid #e879f944",borderRadius:99,fontSize:9,fontWeight:700,padding:"2px 7px",textTransform:"uppercase"}}>{t}</span>)}
                </div>
              </div>
              <div style={{width:46,height:46,borderRadius:23,border:"3px solid #e879f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>💊</div>
            </div>

            {/* Description */}
            <div style={{background:"#e879f911",border:"1px solid #e879f933",borderRadius:12,padding:14,marginBottom:14}}>
              <div style={{color:"#e879f9",fontWeight:700,fontSize:11,marginBottom:5}}>Mechanism / Description</div>
              <div style={{color:"#94a3b8",fontSize:13,lineHeight:1.7}}>{selected.description}</div>
            </div>

            {/* What's in the paid package */}
            <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:12,padding:14,marginBottom:14}}>
              <div style={{color:"#f1f5f9",fontWeight:700,fontSize:13,marginBottom:10}}>📦 Complete Technical Package</div>
              {[
                {icon:"📋",title:"Formulation",desc:"Complete tablet/capsule/injectable formulation with excipients, grades, and percentages"},
                {icon:"⚗️",title:"Synthesis Route",desc:"Step-by-step synthesis process, reaction conditions, reagents, yields"},
                {icon:"📊",title:"Specifications",desc:"IP/BP/USP/EP specifications, assay, impurity limits, dissolution"},
                {icon:"🔬",title:"Analytical Methods",desc:"HPLC, dissolution, related substances, dissolution methods"},
                {icon:"📄",title:"Regulatory Docs",desc:"DMF reference, CEP status, ICH stability data overview"},
                {icon:"🏭",title:"Manufacturing Process",desc:"Batch manufacturing record template, in-process controls, equipment"},
              ].map(item=>(
                <div key={item.title} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10,padding:"9px 12px",background:"#060b14",borderRadius:9,border:"1px solid #1e293b"}}>
                  <span style={{fontSize:16,flexShrink:0}}>{item.icon}</span>
                  <div>
                    <div style={{color:"#cbd5e1",fontSize:12,fontWeight:700}}>{item.title}</div>
                    <div style={{color:"#475569",fontSize:11,marginTop:2,lineHeight:1.4}}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Process overview */}
            <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:12,padding:14,marginBottom:14}}>
              <div style={{color:"#94a3b8",fontSize:13,lineHeight:1.7}}>{selected.process}</div>
            </div>

            {/* CTA buttons */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {isPaid?(
                <>
                  <button onClick={handleRequestQuote} style={{width:"100%",padding:"13px",borderRadius:11,background:"linear-gradient(135deg,#e879f9,#a855f7)",border:"none",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer"}}>
                    📩 Request Complete Technical Package
                  </button>
                  <div style={{color:"#334155",fontSize:11,textAlign:"center"}}>Response within 24 hours · Included in your plan</div>
                </>
              ):(
                <>
                  <div style={{background:"#e879f911",border:"1px solid #e879f933",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
                    <div style={{color:"#e879f9",fontWeight:700,fontSize:13,marginBottom:4}}>Unlock Full Technical Package</div>
                    <div style={{color:"#64748b",fontSize:11,marginBottom:12}}>Subscribe to access complete formulation, synthesis route, specifications, and analytical methods for all {compounds.length} APIs</div>
                    <button onClick={()=>onUpgrade("Full Pharma API Technical Package")} style={{padding:"10px 24px",borderRadius:9,background:"linear-gradient(135deg,#e879f9,#a855f7)",border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                      ✨ Upgrade to Access →
                    </button>
                  </div>
                  <div style={{color:"#334155",fontSize:10,textAlign:"center"}}>Or pay ₹499 per compound → Request a Quote</div>
                  <button onClick={handleRequestQuote} style={{width:"100%",padding:"11px",borderRadius:10,border:"1px solid #e879f9",background:"transparent",color:"#e879f9",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                    📩 Pay ₹499 — Request This Compound Package
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InlineAd(){
  const [i,setI]=useState(0);
  const ads=[
    {b:"BASF India",t:"Acronal® dispersions — premium binder for paints & coatings"},
    {b:"Amazon Business",t:"Lab equipment & chemicals — bulk pricing, GST invoice"},
    {b:"Pidilite Industries",t:"Specialty chemicals & raw materials for formulators"},
    {b:"Merck India",t:"High purity chemicals for R&D, pilot and scale-up"},
    {b:"Flipkart Business",t:"Industrial supplies & packaging at wholesale rates"},
    {b:"Dow Chemical India",t:"WALOCEL™ cellulosics for drymix & construction"},
  ];
  useEffect(()=>{const t=setInterval(()=>setI(x=>(x+1)%ads.length),5000);return()=>clearInterval(t);},[]);
  return(
    <div style={{marginTop:14,background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0,flex:1}}>
        <span style={{background:"#1e293b",color:"#475569",fontSize:8,fontWeight:700,padding:"2px 5px",borderRadius:3,letterSpacing:"0.08em",flexShrink:0}}>AD</span>
        <span style={{color:"#64748b",fontSize:11,fontWeight:700,flexShrink:0}}>{ads[i].b}</span>
        <span style={{color:"#334155",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ads[i].t}</span>
      </div>
      <button onClick={()=>window.open("mailto:info@chemformpro.in?subject=Advertise on ChemForm Pro","_blank")}
        style={{background:"none",border:"1px solid #1e293b",color:"#334155",fontSize:9,padding:"3px 7px",borderRadius:5,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
        Advertise
      </button>
    </div>
  );
}

function BannerAd({onUpgrade, inline=false}){
  const [i,setI]=useState(0);
  const ads=[
    {b:"BASF India",t:"Acronal® & Lutensol® — premium raw materials for coatings"},
    {b:"Amazon Business",t:"Lab equipment & chemicals — bulk pricing, GST invoice"},
    {b:"Dow Chemical India",t:"WALOCEL™ cellulosics for drymix & construction"},
    {b:"Merck India",t:"High purity chemicals for R&D, pilot and scale-up"},
    {b:"Flipkart Business",t:"Industrial supplies & packaging at wholesale rates"},
    {b:"Pidilite Industries",t:"Specialty chemicals & raw materials for formulators"},
  ];
  useEffect(()=>{
    const _resize=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",_resize);
    return()=>window.removeEventListener("resize",_resize);
  },[]);

  useEffect(()=>{ const t=setInterval(()=>setI(x=>(x+1)%ads.length),5000); return()=>clearInterval(t); },[]);
  const ad = ads[i];
  if(inline) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,width:"100%"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0,flex:1}}>
        <span style={{background:"#1e293b",color:"#475569",fontSize:8,fontWeight:700,padding:"2px 4px",borderRadius:3,flexShrink:0}}>AD</span>
        <span style={{color:"#64748b",fontSize:10,fontWeight:700,flexShrink:0}}>{ad.b}</span>
        <span style={{color:"#334155",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ad.t}</span>
      </div>
      <button onClick={onUpgrade} style={{background:"none",border:"none",color:"#334155",fontSize:9,cursor:"pointer",flexShrink:0}}>✕</button>
    </div>
  );
  return(
    <div style={{borderTop:"1px solid #1e293b",background:"#060b14",padding:"6px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
        <span style={{background:"#1e293b",color:"#475569",fontSize:8,fontWeight:700,padding:"2px 4px",borderRadius:3,letterSpacing:"0.08em",flexShrink:0}}>AD</span>
        <span style={{color:"#64748b",fontSize:10,fontWeight:700,flexShrink:0}}>{ad.b}</span>
        <span style={{color:"#334155",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ad.t}</span>
      </div>
      <button onClick={onUpgrade} style={{background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",color:"#fff",fontSize:10,padding:"4px 9px",borderRadius:5,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>Remove Ads ✨</button>
    </div>
  );
}

function ChemEngPanel({planKey, currency, onUpgrade}){
  const [sel,setSel]=useState(null);
  const [search,setSearch]=useState("");
  const isPro = planKey==="pro";
  const isEnterprise = planKey==="enterprise";
  const hasAccess = isPro||isEnterprise;
  const color = "#fb923c";

  if(!hasAccess) return(
    <div style={{display:"flex",flex:1,minHeight:0,overflow:"hidden"}}>
      {/* Left — locked formula list */}
      <div style={{width:260,borderRight:"1px solid #1e293b",overflowY:"auto",padding:10,flexShrink:0,display:"flex",flexDirection:"column"}}>
        <div style={{color:"#fb923c",fontWeight:800,fontSize:12,marginBottom:2}}>⚗️ ChemEng Pro</div>
        <div style={{color:"#475569",fontSize:9,marginBottom:8}}>22 industrial manufacturing processes</div>
        <div style={{background:"#fb923c11",border:"1px solid #fb923c33",borderRadius:7,padding:"7px 9px",marginBottom:8,fontSize:10,color:"#64748b",lineHeight:1.5}}>
          🔒 <span style={{color:"#fb923c",fontWeight:700}}>Pro & Enterprise only</span> — Upgrade to access all industrial processes
        </div>
        {(FORMULAS.chemeng||[]).map(f=>(
          <div key={f.id} onClick={()=>onUpgrade("ChemEng Pro — Industrial Process Library")}
            style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:10,padding:"9px 10px",cursor:"pointer",marginBottom:5,opacity:0.5,transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#fb923c44";e.currentTarget.style.opacity="0.7";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e293b";e.currentTarget.style.opacity="0.5";}}>
            <div style={{color:"#f1f5f9",fontWeight:700,fontSize:11,marginBottom:2,display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:9}}>🔒</span>{f.name}
            </div>
            <div style={{color:"#475569",fontSize:9,lineHeight:1.3}}>{f.sub}</div>
          </div>
        ))}
      </div>
      {/* Right — upgrade prompt */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",textAlign:"center",overflowY:"auto"}}>
        <div style={{fontSize:48,marginBottom:14}}>⚗️</div>
        <div style={{color:"#fb923c",fontWeight:900,fontSize:20,marginBottom:8}}>ChemEng Pro</div>
        <div style={{color:"#64748b",fontSize:13,lineHeight:1.8,marginBottom:20,maxWidth:360}}>
          22 industrial-scale manufacturing processes including polymer synthesis, epoxy & alkyd resin, cellulose ethers, biofuels, pharma APIs and more.<br/><br/>
          <span style={{color:"#94a3b8"}}>Includes reactor parameters, process conditions, equipment specifications and engineering data.</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:24,maxWidth:380,width:"100%"}}>
          {["PVAc & Acrylic Emulsion","Epoxy & Alkyd Resin","Polyester & Polyether Polyols","EVA & SBR Latex","HPMC & CMC Cellulose Ethers","Ethanol & Biodiesel","Paracetamol API Synthesis","Sodium Silicate & more"].map(f=>(
            <div key={f} style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:9,padding:"9px 12px",display:"flex",gap:8,alignItems:"flex-start"}}>
              <span style={{color:"#fb923c",fontSize:11,flexShrink:0}}>⚗</span>
              <span style={{color:"#475569",fontSize:10,lineHeight:1.4}}>{f}</span>
            </div>
          ))}
        </div>
        <button onClick={()=>onUpgrade("ChemEng Pro — Industrial Process Library")}
          style={{background:"linear-gradient(135deg,#fb923c,#f97316)",border:"none",color:"#fff",fontWeight:800,fontSize:14,padding:"13px 32px",borderRadius:11,cursor:"pointer",marginBottom:8,width:"100%",maxWidth:320}}>
          ✨ Upgrade to Pro — ₹2,399 →
        </button>
        <div style={{color:"#334155",fontSize:11}}>Available on Pro and Enterprise plans · 30-day validity</div>
      </div>
    </div>
  );

  const formulas = (FORMULAS.chemeng||[]).filter(f=>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.sub.toLowerCase().includes(search.toLowerCase())
  );

  // Pro can see all but proLocked items are restricted (process/equipment hidden)
  const canSeeProcess = isEnterprise;

  return(
    <div style={{display:"flex",flex:1,minHeight:0,overflow:"hidden"}}>
      {/* Left list */}
      <div style={{width:260,borderRight:"1px solid #1e293b",overflowY:"auto",padding:10,flexShrink:0,display:"flex",flexDirection:"column"}}>
        <div style={{color,fontWeight:800,fontSize:12,marginBottom:2}}>⚗️ ChemEng Pro</div>
        <div style={{color:"#475569",fontSize:9,marginBottom:8}}>{formulas.length} industrial processes</div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search process..."
          style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:7,padding:"7px 10px",color:"#f1f5f9",fontSize:11,outline:"none",marginBottom:8,boxSizing:"border-box"}}/>
        {isPro&&(
          <div style={{background:"#a78bfa11",border:"1px solid #a78bfa33",borderRadius:7,padding:"6px 9px",marginBottom:8,fontSize:9,color:"#64748b",lineHeight:1.4}}>
            <span style={{color:"#a78bfa",fontWeight:700}}>Pro access:</span> Ingredients visible. Full process on Enterprise.{" "}
            <span onClick={()=>onUpgrade("Full ChemEng Process Details")} style={{color:"#a78bfa",cursor:"pointer",fontWeight:700,textDecoration:"underline"}}>Upgrade →</span>
          </div>
        )}
        <div style={{flex:1,overflowY:"auto"}}>
          {formulas.map(f=>{
            const isProLocked = f.proLocked && isPro;
            return(
              <div key={f.id} onClick={()=>setSel(f)}
                style={{background:sel?.id===f.id?"#1a0f05":"#0a0f1e",border:`1px solid ${sel?.id===f.id?color:"#1e293b"}`,borderRadius:10,padding:"9px 10px",cursor:"pointer",marginBottom:5,transition:"all 0.2s"}}>
                <div style={{color:"#f1f5f9",fontWeight:700,fontSize:11,marginBottom:2,display:"flex",alignItems:"center",gap:5}}>
                  {isProLocked&&<span style={{fontSize:9}}>🔒</span>}
                  {f.name}
                </div>
                <div style={{color:"#475569",fontSize:9,lineHeight:1.3,marginBottom:4}}>{f.sub}</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {f.tags.slice(0,2).map(t=>(
                    <span key={t} style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:99,fontSize:7,fontWeight:700,padding:"1px 6px",textTransform:"uppercase"}}>{t}</span>
                  ))}
                  {isProLocked&&<span style={{background:"#a78bfa22",color:"#a78bfa",border:"1px solid #a78bfa44",borderRadius:99,fontSize:7,fontWeight:700,padding:"1px 6px"}}>ENTERPRISE</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right detail */}
      <div style={{flex:1,overflowY:"auto",padding:20}}>
        {!sel&&(
          <div style={{textAlign:"center",padding:"60px 20px",color:"#475569"}}>
            <div style={{fontSize:44,marginBottom:12}}>⚗️</div>
            <div style={{fontSize:15,fontWeight:700,color:"#64748b"}}>Select a process</div>
            <div style={{fontSize:11,marginTop:5,color:"#334155"}}>{formulas.length} industrial manufacturing processes</div>
          </div>
        )}
        {sel&&(()=>{
          const isProLocked = sel.proLocked && isPro;
          const costINR = sel.ingredients ? calcCostPerKg(sel.ingredients) : 0;
          return(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div style={{flex:1,marginRight:12}}>
                  <div style={{color:"#f1f5f9",fontSize:17,fontWeight:800,lineHeight:1.2,marginBottom:4}}>{sel.name}</div>
                  <div style={{color,fontSize:12,fontWeight:700,marginBottom:6}}>{sel.sub}</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {sel.tags.map(t=>(
                      <span key={t} style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:99,fontSize:9,fontWeight:700,padding:"2px 7px",textTransform:"uppercase"}}>{t}</span>
                    ))}
                    {isProLocked&&<span style={{background:"#a78bfa22",color:"#a78bfa",border:"1px solid #a78bfa44",borderRadius:99,fontSize:9,fontWeight:700,padding:"2px 7px"}}>ENTERPRISE ONLY</span>}
                  </div>
                </div>
                <div style={{width:46,height:46,borderRadius:23,border:`3px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>⚗️</div>
              </div>

              {/* Ingredients — visible to all Pro/Enterprise */}
              {sel.ingredients&&(
                <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:12,padding:14,marginBottom:14}}>
                  <div style={{color:"#f1f5f9",fontWeight:700,fontSize:13,marginBottom:10}}>📋 Raw Materials & Composition</div>
                  {sel.ingredients.map((ing,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #0f172a"}}>
                      <span style={{color:"#94a3b8",fontSize:12,flex:1}}>{ing.n}</span>
                      <span style={{color,fontWeight:700,fontSize:12,minWidth:40,textAlign:"right"}}>{ing.p}%</span>
                      <span style={{color:"#475569",fontSize:11,minWidth:70,textAlign:"right"}}>{fmtCur(ing.c,currency)}/kg</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:8,borderTop:`1px solid ${color}33`}}>
                    <span style={{color:"#64748b",fontSize:12}}>Estimated RM Cost/kg</span>
                    <span style={{color,fontWeight:900,fontSize:18}}>{fmtCur(costINR,currency)}</span>
                  </div>
                </div>
              )}

              {/* Process — Enterprise only */}
              {isProLocked?(
                <div style={{background:"#a78bfa11",border:"1px solid #a78bfa33",borderRadius:12,padding:20,textAlign:"center",marginBottom:14}}>
                  <div style={{fontSize:28,marginBottom:10}}>🔒</div>
                  <div style={{color:"#a78bfa",fontWeight:700,fontSize:14,marginBottom:6}}>Full Process Details — Enterprise Only</div>
                  <div style={{color:"#64748b",fontSize:12,lineHeight:1.7,marginBottom:16}}>
                    The complete manufacturing process, reactor parameters, process control points, safety considerations, and scale-up guidance are available on Enterprise plan.
                  </div>
                  <button onClick={()=>onUpgrade("Full ChemEng Process Details")}
                    style={{background:"linear-gradient(135deg,#a78bfa,#7c3aed)",border:"none",color:"#fff",fontWeight:700,fontSize:13,padding:"10px 24px",borderRadius:9,cursor:"pointer"}}>
                    Upgrade to Enterprise →
                  </button>
                </div>
              ):(
                sel.process&&(
                  <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:12,padding:16,marginBottom:14}}>
                    <div style={{color:"#f1f5f9",fontWeight:700,fontSize:13,marginBottom:10}}>⚙️ Manufacturing Process</div>
                    <pre style={{color:"#94a3b8",fontSize:11,lineHeight:1.8,whiteSpace:"pre-wrap",fontFamily:"monospace",margin:0}}>{sel.process}</pre>
                  </div>
                )
              )}

              {/* Equipment */}
              {!isProLocked&&sel.equipment&&(
                <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:12,padding:14,marginBottom:14}}>
                  <div style={{color:"#f1f5f9",fontWeight:700,fontSize:13,marginBottom:10}}>🏭 Equipment List</div>
                  {sel.equipment.map((eq,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid #0f172a"}}>
                      <span style={{color:color,fontSize:12}}>▸</span>
                      <span style={{color:"#94a3b8",fontSize:12}}>{eq}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Request engineering quote */}
              <div style={{background:color+"11",border:`1px solid ${color}33`,borderRadius:12,padding:16,textAlign:"center"}}>
                <div style={{color,fontWeight:700,fontSize:13,marginBottom:6}}>📐 Engineering Consultation</div>
                <div style={{color:"#64748b",fontSize:12,lineHeight:1.6,marginBottom:14}}>
                  Need plant design, reactor sizing, mass & energy balances, P&ID, or project feasibility study for this process?
                </div>
                <button onClick={()=>{
                  const subject=encodeURIComponent(`Engineering Quote — ${sel.name}`);
                  const body=encodeURIComponent(`Hi,

I need engineering consultation for: ${sel.name}

Please provide details on plant design, reactor sizing and project feasibility.

Regards`);
                  window.open(`mailto:info@chemformpro.in?subject=${subject}&body=${body}`,"_blank");
                }} style={{background:`linear-gradient(135deg,${color},#f97316)`,border:"none",color:"#fff",fontWeight:700,fontSize:13,padding:"10px 24px",borderRadius:9,cursor:"pointer"}}>
                  📩 Request Engineering Quote →
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default function App(){
  const [user,setUser]=useState(null);
  const [planKey,setPlanKey]=useState("free");
  const [isMobile,setIsMobile]=useState(window.innerWidth<768);
  const [mobileView,setMobileView]=useState("list");
  const [appReady,setAppReady]=useState(false);
  const [currency,setCurrency]=useState("INR");
  const [catId,setCatId]=useState("drymix");
  const [selected,setSelected]=useState(null);
  const [rightTab,setRightTab]=useState("formula");
  const [search,setSearch]=useState("");
  const [showPricing,setShowPricing]=useState(false);
  const [paywallMsg,setPaywallMsg]=useState(null);
  const [usage,setUsage]=useState({ai:0,process:0,equipment:0});
  const [paymentPortal,setPaymentPortal]=useState(null); // {plan, currency}

  const plan=PLANS[planKey];
  const isChemEng=catId==="chemeng";
  const isRequest=catId==="request";
  const isPharma=catId==="pharma";
  const priority=user?INDUSTRY_PRIORITY[user.industry]||[]:[];

  const handleLogin=useCallback((u)=>{
    setUser(u);
    setPlanKey(u.plan||"free");
    if(INDUSTRY_PRIORITY[u.industry]?.[0]) setCatId(INDUSTRY_PRIORITY[u.industry][0]);
    // Save login so device remembers
    try{ window.localStorage.setItem("chemform_user", JSON.stringify(u)); }catch(e){}
  },[]);

  // Load saved user on startup
  useEffect(()=>{
    try{
      const saved=window.localStorage.getItem("chemform_user");
      if(saved){
        const u=JSON.parse(saved);
        if(u&&u.email&&u.name){
          setUser(u);
          setPlanKey(u.plan||"free");
          if(INDUSTRY_PRIORITY[u.industry]?.[0]) setCatId(INDUSTRY_PRIORITY[u.industry][0]);
        }
      }
    }catch(e){}
    // If no saved user, create guest session automatically
    if(!window.localStorage.getItem("chemform_user")){
      const guest = {name:"Guest",email:"",industry:"paints",plan:"free",isGuest:true};
      setUser(guest);
      setCatId("paints");
    }
    setAppReady(true);
  },[]);

  const allFormulas=FORMULAS[catId]||[];
  const cat=CATEGORIES.find(c=>c.id===catId);
  const catColor=cat?.color||"#4f9cf9";

  const handleSelect=(f)=>{
    setSelected(f); setRightTab("formula");
    if(isMobile) setMobileView("detail");
  };

  const handleUpgrade=(msg)=>{ setPaywallMsg(msg||null); setShowPricing(true); };

  const handleSelectPlan=(key,planObj)=>{
    if(key==="free"){ setPlanKey("free"); setShowPricing(false); setPaywallMsg(null); return; }
    setShowPricing(false);
    setPaymentPortal({plan:planObj||PLANS.annual, key:"annual"});
  };

  const handlePaymentSuccess=(data)=>{
    setPlanKey("annual");
    // Save plan to localStorage
    try{
      const u=JSON.parse(window.localStorage.getItem("chemform_user")||"{}");
      u.plan="annual";
      u.planExpires=data.expires||Date.now()+(365*24*60*60*1000);
      u.planEmail=data.email||u.email;
      window.localStorage.setItem("chemform_user",JSON.stringify(u));
    }catch(e){}
    setUsage(prev=>({...prev,ai:0}));
    setPaymentPortal(null);
    setPaywallMsg(null);
  };

  const useQuota=(type)=>setUsage(u=>({...u,[type]:u[type]+1}));

  if(!appReady) return(
    <div style={{position:"fixed",inset:0,background:"#060b14",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:12}}>⚗</div>
        <div style={{color:"#475569",fontSize:13}}>Loading...</div>
      </div>
    </div>
  );
  if(!user) return <LoginScreen onLogin={handleLogin}/>;

  return(
    <div style={{fontFamily:"'DM Sans',system-ui,sans-serif",background:"#060b14",height:"100vh",color:"#f1f5f9",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:7px;height:7px}
        ::-webkit-scrollbar-track{background:#0d1626}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:4px;border:1px solid #0d1626}
        ::-webkit-scrollbar-thumb:hover{background:#475569}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        input,select,button{font-family:inherit}
      `}</style>

      {/* Payment Portal */}
      {paymentPortal&&<PaymentPortal onSuccess={handlePaymentSuccess} onCancel={()=>setPaymentPortal(null)}/>}

      {/* Pricing Modal */}
      {showPricing&&!paymentPortal&&<PricingModal onClose={()=>{setShowPricing(false);setPaywallMsg(null);}} currency={currency} onSelectPlan={handleSelectPlan}/>}

      {/* Paywall prompt */}
      {paywallMsg&&!showPricing&&!paymentPortal&&(
        <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:18,padding:24,maxWidth:300,width:"90%",textAlign:"center"}}>
            <div style={{fontSize:34,marginBottom:9}}>🔒</div>
            <div style={{color:"#f1f5f9",fontWeight:800,fontSize:15,marginBottom:6}}>Premium Feature</div>
            <div style={{color:"#64748b",fontSize:12,lineHeight:1.6,marginBottom:16}}><strong style={{color:"#94a3b8"}}>{paywallMsg}</strong></div>
            <button onClick={()=>setShowPricing(true)} style={{width:"100%",background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",color:"#fff",fontWeight:800,fontSize:13,padding:"11px",borderRadius:10,cursor:"pointer",marginBottom:8}}>View Plans & Upgrade</button>
            <button onClick={()=>setPaywallMsg(null)} style={{width:"100%",background:"transparent",border:"1px solid #1e293b",color:"#475569",fontWeight:600,fontSize:12,padding:"8px",borderRadius:10,cursor:"pointer"}}>← Go Back</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{borderBottom:"1px solid #1e293b",padding:"7px 12px",display:"flex",alignItems:"center",background:"#060b14",flexShrink:0,gap:6}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
          <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>⚗</div>
          <div style={{fontWeight:900,fontSize:13,display:"flex",alignItems:"center",gap:4}}>
            ChemForm <span style={{color:"#4f9cf9"}}>Pro</span>
          </div>
        </div>
        {/* AI Badge */}
        <QBadge used={usage.ai} limit={plan.ai} label="AI" color="#4f9cf9"/>
        {/* Spacer */}
        <div style={{flex:1}}/>
        {/* Currency */}
        <div style={{display:"flex",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:6,overflow:"hidden",flexShrink:0}}>
          {["INR","USD"].map(cur=>(
            <button key={cur} onClick={()=>setCurrency(cur)} style={{padding:"4px 8px",border:"none",background:currency===cur?"#1e293b":"transparent",color:currency===cur?"#f1f5f9":"#475569",fontSize:9,fontWeight:700,cursor:"pointer"}}>{cur==="INR"?"₹":"$"}</button>
          ))}
        </div>
        {/* Upgrade */}
        <button onClick={()=>setShowPricing(true)} style={{background:planKey==="free"?"linear-gradient(135deg,#4f9cf9,#a78bfa)":"transparent",border:`1px solid ${plan.color}`,color:planKey==="free"?"#fff":plan.color,fontSize:9,fontWeight:800,padding:"5px 9px",borderRadius:6,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
          {planKey==="free"?"✨ Unlock All":"✅ Annual"}
        </button>
        {/* Logout */}
        {user&&!user.isGuest&&(
          <button title="Logout" onClick={()=>{
            try{window.localStorage&&window.localStorage.removeItem("chemform_user");}catch(e){}
            try{window.localStorage&&window.localStorage.removeItem("chemform_usage");}catch(e){}
            const guest={name:"Guest",email:"",industry:"paints",plan:"free",isGuest:true};
            setUser(guest);setSelected(null);setPlanKey("free");
          }} style={{background:"transparent",border:"1px solid #1e293b",color:"#475569",fontSize:11,fontWeight:600,padding:"5px 8px",borderRadius:6,cursor:"pointer",flexShrink:0}}>
            ⏏
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div style={{display:"flex",borderBottom:"1px solid #1e293b",background:"#060b14",flexShrink:0,overflowX:"auto"}}>
        {CATEGORIES.map(c=>(
          <button key={c.id} onClick={()=>{setCatId(c.id);setSelected(null);setSearch("");setMobileView("list");}} style={{padding:"8px 12px",border:"none",background:"none",cursor:"pointer",color:catId===c.id?c.color:"#475569",borderBottom:`2px solid ${catId===c.id?c.color:"transparent"}`,fontWeight:catId===c.id?700:500,fontSize:10,transition:"all 0.2s",marginBottom:-1,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:3}}>
            {c.icon} {c.label}
            {c.enterprise&&<span style={{background:"#fb923c22",color:"#fb923c",fontSize:7,fontWeight:800,padding:"1px 4px",borderRadius:3}}>ENT</span>}
            {c.paid&&<span style={{background:"#e879f922",color:"#e879f9",fontSize:7,fontWeight:800,padding:"1px 4px",borderRadius:3}}>PRO</span>}
            {c.special&&<span style={{background:"#f59e0b22",color:"#f59e0b",fontSize:7,fontWeight:800,padding:"1px 4px",borderRadius:3}}>NEW</span>}
            {priority.includes(c.id)&&!c.enterprise&&!c.special&&<span style={{background:"#34d39922",color:"#34d399",fontSize:7,fontWeight:800,padding:"1px 4px",borderRadius:3}}>★</span>}
          </button>
        ))}
      </div>

      {/* Body */}
      {isRequest?(
        <div style={{flex:1,overflowY:"auto"}}>
          <RequestFormula user={user} planKey={planKey} currency={currency} onUpgrade={handleUpgrade}/>
        </div>
      ):isPharma?(
        <div style={{flex:1,display:"flex",minHeight:0,overflow:"hidden"}}>
          <PharmaPanel planKey={planKey} currency={currency} onUpgrade={handleUpgrade}/>
        </div>
      ):isChemEng?(
        <div style={{flex:1,display:"flex",minHeight:0,overflow:"hidden"}}>
          <ChemEngPanel planKey={planKey} currency={currency} onUpgrade={handleUpgrade}/>
        </div>
      ):(
        <div style={{display:"flex",flex:1,minHeight:0,overflow:"hidden"}}>
          <div style={{width:isMobile?(mobileView==="list"?"100%":"0px"):"252px",borderRight:isMobile?"none":"1px solid #1e293b",overflowY:"auto",padding:isMobile&&mobileView!=="list"?0:10,flexShrink:0,display:"flex",flexDirection:"column",transition:"width 0.3s ease",overflow:isMobile&&mobileView!=="list"?"hidden":"auto"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`🔍  Search ${cat?.label||""}...`}
              style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:7,padding:"7px 10px",color:"#f1f5f9",fontSize:11,outline:"none",marginBottom:8}}/>
            {planKey==="free"&&(
              <div style={{background:catColor+"11",border:`1px solid ${catColor}22`,borderRadius:7,padding:"6px 9px",marginBottom:8,fontSize:10,color:"#475569"}}>
                🔒 {allFormulas.filter(f=>!f.free).length} locked · <span onClick={()=>handleUpgrade()} style={{color:catColor,cursor:"pointer",fontWeight:700}}>Unlock all formulas</span>
              </div>
            )}
            <div style={{flex:1,overflowY:"auto"}}>
              {allFormulas.filter(f=>!search||(f.name.toLowerCase().includes(search.toLowerCase())||f.sub?.toLowerCase().includes(search.toLowerCase()))).map(f=>{
                const locked=planKey==="free"&&!f.free;
                const costINR=f.ingredients.reduce((t,i)=>t+(i.p/100)*i.c,0);
                return(
                  <div key={f.id} onClick={()=>handleSelect(f)} style={{background:selected?.id===f.id?"#0f172a":"#0a0f1e",border:`1px solid ${selected?.id===f.id?catColor:"#1e293b"}`,borderRadius:10,padding:"10px 11px",cursor:"pointer",marginBottom:6,opacity:locked?0.5:1,transition:"all 0.2s",boxShadow:selected?.id===f.id?`0 0 12px ${catColor}33`:"none"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{minWidth:0,marginRight:5}}>
                        <div style={{color:"#f1f5f9",fontWeight:700,fontSize:11,marginBottom:1}}>{locked?"🔒 ":""}{f.name}</div>
                        <div style={{color:"#475569",fontSize:9,marginBottom:4,lineHeight:1.3}}>{f.sub}</div>
                        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{f.tags.slice(0,2).map(t=><Pill key={t} label={t} color={catColor}/>)}</div>
                      </div>
                      <Ring score={f.score} size={37}/>
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:6}}>
                      <span style={{color:"#64748b",fontSize:9}}>💰 <span style={{color:"#94a3b8"}}>{fmtCur(costINR,currency)}/kg</span></span>
                      <span style={{color:"#64748b",fontSize:9}}>🧪 <span style={{color:"#94a3b8"}}>{f.ingredients.length} ingr.</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{flex:1,display:isMobile&&mobileView==="list"?"none":"flex",flexDirection:"column",minHeight:0,minWidth:0}}>
            <div style={{borderBottom:"1px solid #1e293b",display:"flex",padding:"0 12px",background:"#060b14",flexShrink:0}}>
              {isMobile&&<button onClick={()=>{setMobileView("list");setSelected(null);}} style={{background:"none",border:"none",color:"#4f9cf9",fontSize:20,cursor:"pointer",padding:"0 8px 0 0",flexShrink:0}}>☰</button>}
              {[{id:"formula",l:"📋 Formula"},{id:"optimizer",l:isMobile?"🤖 AI":"🤖 AI Optimize"},{id:"batch",l:"⚖️ Batch"}].map(t=>(
                <button key={t.id} onClick={()=>setRightTab(t.id)} style={{padding:"8px 12px",border:"none",background:"none",cursor:"pointer",color:rightTab===t.id?"#4f9cf9":"#475569",borderBottom:`2px solid ${rightTab===t.id?"#4f9cf9":"transparent"}`,fontWeight:rightTab===t.id?700:500,fontSize:11,transition:"all 0.2s",marginBottom:-1,whiteSpace:"nowrap"}}>{t.l}</button>
              ))}
            </div>
            <div style={{flex:1,overflowY:"auto",padding:16,minWidth:0}}>
              {!selected&&(
                <div style={{textAlign:"center",padding:"60px 20px",color:"#475569"}}>
                  <div style={{fontSize:40,marginBottom:10}}>{cat?.icon||"⚗️"}</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#64748b"}}>Select a formula</div>
                  <div style={{fontSize:11,marginTop:5,color:"#334155"}}>{allFormulas.length} formulas · {allFormulas.filter(f=>f.free).length} free</div>
                  {priority.includes(catId)&&<div style={{color:"#34d399",fontSize:11,marginTop:4}}>★ Priority category for your industry</div>}
                </div>
              )}
              {selected&&rightTab==="formula"&&<FormulaDetail formula={selected} currency={currency} planKey={planKey} usage={usage} onUseQuota={useQuota} onUpgrade={handleUpgrade}/>}
              {selected&&rightTab==="optimizer"&&<AIOptimizer formula={selected} planKey={planKey} currency={currency} usage={usage} onUseQuota={useQuota} onUpgrade={handleUpgrade}/>}
              {selected&&rightTab==="batch"&&(
                planKey==="free"?(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,padding:"40px 24px",textAlign:"center"}}>
                    <div style={{fontSize:40,marginBottom:12}}>⚖️</div>
                    <div style={{color:"#f1f5f9",fontWeight:700,fontSize:16,marginBottom:8}}>Batch Calculator</div>
                    <div style={{color:"#64748b",fontSize:13,lineHeight:1.7,marginBottom:20,maxWidth:300}}>
                      Calculate exact quantities and total RM cost for any batch size — kg, MT or lbs.
                    </div>
                    <button onClick={()=>window.open(RZP.formula49,"_blank")}
                      style={{background:"linear-gradient(135deg,#34d399,#10b981)",border:"none",color:"#fff",fontWeight:800,fontSize:13,padding:"11px 24px",borderRadius:10,cursor:"pointer",marginBottom:10,width:"100%",maxWidth:300}}>
                      Unlock this formula — ₹49 →
                    </button>
                    <button onClick={()=>window.open(RZP.annual,"_blank")}
                      style={{background:"linear-gradient(135deg,#4f9cf9,#a78bfa)",border:"none",color:"#fff",fontWeight:800,fontSize:13,padding:"11px 24px",borderRadius:10,cursor:"pointer",marginBottom:8,width:"100%",maxWidth:300}}>
                      All formulas + batch calc — ₹3,999/yr →
                    </button>
                    <div style={{color:"#334155",fontSize:11}}>365 days · 250+ formulas · 30 AI/month</div>
                  </div>
                ):<BatchCalc formula={selected} currency={currency}/>
              )}
            </div>
          </div>
        </div>
      )}

      <BannerAd onUpgrade={()=>handleUpgrade()}/>
    </div>
  );
}
