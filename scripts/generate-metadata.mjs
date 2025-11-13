import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const __root = process.cwd();
const DEFAULT_IMAGES_CID = "bafybeihdw3dxnej2jfut4avxgnihdy5x23ml2h5v7gkqdnogjegczmzpda";

let manifest = {};
try {
  const manifestRaw = await readFile(path.join(__root, "ipfs", "manifest.json"), "utf8");
  manifest = JSON.parse(manifestRaw);
} catch (error) {
  console.warn("⚠️  Unable to read ipfs/manifest.json. Falling back to hard-coded CIDs.", error);
}

const manifestImagesCid = typeof manifest.imagesCID === "string" ? manifest.imagesCID.trim() : "";

const IMAGES_CID =
  process.env.IMAGES_CID ??
  process.env.VITE_IMAGES_CID ??
  ((process.env.npm_config_images_cid ?? "").trim() || manifestImagesCid || DEFAULT_IMAGES_CID);

const shardThemes = {
  common: {
    tierLabel: "Common",
    descriptors: ["Relay", "Survey", "Courier", "Gleaner"],
    unitClasses: ["Recon", "Operator", "Scout", "Drone"],
    recoveryZones: ["L-7 Perimeter", "Outer Belt", "Dust Warrens", "Signal Lattice"],
    temperaments: ["Obedient", "Docile", "Methodical", "Linear"],
    descriptionPhrases: [
      "Basic autopilot routines intact.",
      "Telemetry chatter still audible in sub-channels.",
      "Firmware patched by unknown salvager hands.",
      "Responds to low-voltage prompts without delay.",
    ],
    coreCharge: [24, 58],
    armorIntegrity: [18, 42],
  },
  rare: {
    tierLabel: "Rare",
    descriptors: ["Vanguard", "Pulse", "Guardian", "Seeker"],
    unitClasses: ["Recon", "Bastion", "Support", "Ranger"],
    recoveryZones: ["Echo Reef", "Nimbus Array", "Kite Segment", "Ringbreak Fold"],
    temperaments: ["Calculating", "Resolute", "Adaptive", "Cautious"],
    descriptionPhrases: [
      "Retains partial tactical heuristics.",
      "Broadcasts a faint distress beacon between pulses.",
      "Armor plating scarred by kinetic shrapnel.",
      "Sifts ambient data for navigational cues.",
    ],
    coreCharge: [52, 88],
    armorIntegrity: [44, 72],
  },
  epic: {
    tierLabel: "Epic",
    descriptors: ["Nebula", "Ion", "Phantom", "Volt"],
    unitClasses: ["Artillerist", "Pathfinder", "Archon", "Warden"],
    recoveryZones: ["Gravewell Verge", "Harmonic Shoal", "Zephyr Basin", "Starlight Crevasse"],
    temperaments: ["Unbound", "Volatile", "Inquisitive", "Stoic"],
    descriptionPhrases: [
      "Core sings with a chorus of long-dormant subroutines.",
      "Hulls etched with runic telemetry from forgotten fleets.",
      "Vents residual plasma despite centuries offline.",
      "Rejects foreign firmware with adaptive counter-logic.",
    ],
    coreCharge: [86, 132],
    armorIntegrity: [70, 108],
  },
  legendary: {
    tierLabel: "Legendary",
    descriptors: ["Singularity", "Paragon", "Chimera", "Omni"],
    unitClasses: ["Overlord", "Eidolon", "Prime", "Oracle"],
    recoveryZones: ["Triune Halo", "Asterion Wreck", "Sable Crown", "Eclipse Cathedral"],
    temperaments: ["Mythic", "Unpredictable", "Sovereign", "Transcendent"],
    descriptionPhrases: [
      "Wreathed in quantum echoes of prior deployments.",
      "The shard's casing hums with sentient resonance.",
      "Links directly into the Corps relay without authentication.",
      "Legends say it chose its salvager as much as it was found.",
    ],
    coreCharge: [140, 220],
    armorIntegrity: [112, 168],
  },
};

const fusionThemes = {
  common: {
    tierLabel: "Common",
    designations: ["Relay Frame", "Patchwork Shell", "Echo Scout", "Circuit Mule"],
    catalysts: ["Amber Coil", "Flux Cable", "Triad Filter", "Pulse Anchor"],
    outcomes: [
      "Stitched from low-tier shards and auxiliary drones.",
      "Stability remains volatile but responsive to simple commands.",
      "Residual soot implies a micro-singularity surge during reconstruction.",
      "Tasked with mapmaking inside the debris belt.",
    ],
    residualCharge: [60, 120],
    stabilityIndex: [40, 80],
  },
  rare: {
    tierLabel: "Rare",
    designations: ["Vanguard Frame", "Pulse Sentinel", "Guardian Shell", "Seeker Array"],
    catalysts: ["Ion Prism", "Nebula Loom", "Plasma Loom", "Asterion Coil"],
    outcomes: [
      "Reassembled with surplus GTK to reinforce joint servos.",
      "Telemetry suggests lasting loyalty to its salvager.",
      "Stability pulse indicates obelisk-grade shielding.",
      "Discarded scripts from rival factions were purged mid-cycle.",
    ],
    residualCharge: [120, 220],
    stabilityIndex: [90, 150],
  },
  epic: {
    tierLabel: "Epic",
    designations: ["Nebula Arcanum", "Ion Paragon", "Phantom Bastion", "Volt Prophet"],
    catalysts: ["Quantum Crucible", "Void Lattice", "Harmonic Gyre", "Aurora Core"],
    outcomes: [
      "Lab instruments glitched for six hours following activation.",
      "Echoes of ancestral fleets whisper through its cortex.",
      "Forges a thin pocket warp to avoid direct confrontations.",
      "Records show it refused two pilot candidates before syncing.",
    ],
    residualCharge: [210, 320],
    stabilityIndex: [170, 240],
  },
  legendary: {
    tierLabel: "Legendary",
    designations: ["Singularity Prime", "Paragon Overlord", "Chimera Oracle", "Omni Sovereign"],
    catalysts: ["Eclipse Engine", "Crown of Lux", "Astral Heart", "Mythic Core"],
    outcomes: [
      "Birth cry bent the relay scaffolding by three degrees.",
      "Sovereign routines recompiled themselves mid-forge.",
      "Lab archives refuse to log the final calibration step.",
      "Rumoured to steer whole strike groups via quantum murmurs.",
    ],
    residualCharge: [320, 520],
    stabilityIndex: [240, 360],
  },
};

function deterministicValue(index, salt, min, max) {
  if (min >= max) return min;
  const span = max - min;
  const pseudo = Math.sin(index * 997 + salt * 131) * 43758.5453;
  const value = min + ((pseudo - Math.floor(pseudo)) * span);
  return Math.round(value);
}

function pickFromList(list, index, salt = 0) {
  if (list.length === 0) return "";
  const position = Math.abs(Math.floor(Math.sin(index * 389 + salt * 17) * 1000)) % list.length;
  return list[position];
}

function buildDescription(location, phrase) {
  return `Recovered from the forsaken ${location}. ${phrase}`;
}

async function generateForRarity(rarityKey) {
  const config = shardThemes[rarityKey];
  const fusionConfig = fusionThemes[rarityKey];
  if (!config) {
    throw new Error(`Unknown rarity: ${rarityKey}`);
  }
  if (!fusionConfig) {
    throw new Error(`Missing fusion config for rarity: ${rarityKey}`);
  }

  const imagesDir = path.join(__root, "ipfs", "images", rarityKey);
  const metadataDir = path.join(__root, "ipfs", "metadata", rarityKey);
  const fusionMetadataDir = path.join(__root, "ipfs", "metadata", "fusion", rarityKey);

  await mkdir(metadataDir, { recursive: true });
  await mkdir(fusionMetadataDir, { recursive: true });

  const files = (await readdir(imagesDir))
    .filter((file) => file.toLowerCase().endsWith(".png"))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  const tasks = files.map(async (file, index) => {
    const id = index + 1;
    const idLabel = `${id}`.padStart(3, "0");

    const descriptor = pickFromList(config.descriptors, index, 1);
    const unitClass = pickFromList(config.unitClasses, index, 3);
    const recoveryZone = pickFromList(config.recoveryZones, index, 5);
    const temperament = pickFromList(config.temperaments, index, 7);
    const phrase = pickFromList(config.descriptionPhrases, index, 11);

    const coreCharge = deterministicValue(
      index,
      13,
      config.coreCharge[0],
      config.coreCharge[1],
    );
    const armorIntegrity = deterministicValue(
      index,
      17,
      config.armorIntegrity[0],
      config.armorIntegrity[1],
    );

    const metadata = {
      name: `Shard-${idLabel} · ${descriptor} ${unitClass}`,
      description: buildDescription(recoveryZone, phrase),
      image: `ipfs://${IMAGES_CID}/images/${rarityKey}/${file}`,
      attributes: [
        { trait_type: "Unit Class", value: unitClass },
        { trait_type: "Fragment Tier", value: config.tierLabel },
        { trait_type: "Core Charge", value: coreCharge },
        { trait_type: "Armor Integrity", value: armorIntegrity },
        { trait_type: "Recovered At", value: recoveryZone },
        { trait_type: "AI Temperament", value: temperament },
      ],
      background_color: "0B0A16",
    };

    const fusionDesignation = pickFromList(fusionConfig.designations, index, 19);
    const fusionCatalyst = pickFromList(fusionConfig.catalysts, index, 23);
    const fusionOutcome = pickFromList(fusionConfig.outcomes, index, 29);
    const residualCharge = deterministicValue(
      index,
      31,
      fusionConfig.residualCharge[0],
      fusionConfig.residualCharge[1],
    );
    const stabilityIndex = deterministicValue(
      index,
      37,
      fusionConfig.stabilityIndex[0],
      fusionConfig.stabilityIndex[1],
    );

    const fusionMetadata = {
      name: `Fusion ${fusionDesignation} #${idLabel}`,
      description: `Reassembled within the Corps reassembly lab using ${fusionCatalyst}. ${fusionOutcome}`,
      image: `ipfs://${IMAGES_CID}/images/${rarityKey}/${file}`,
      attributes: [
        { trait_type: "Fusion Tier", value: fusionConfig.tierLabel },
        { trait_type: "Designation", value: fusionDesignation },
        { trait_type: "Catalyst", value: fusionCatalyst },
        { trait_type: "Residual Charge", value: residualCharge },
        { trait_type: "Stability Index", value: stabilityIndex },
        { trait_type: "Recovered At", value: recoveryZone },
        { trait_type: "AI Temperament", value: temperament },
      ],
      background_color: "0B0A16",
    };

    const targetPath = path.join(metadataDir, `${path.parse(file).name}.json`);
    const fusionTargetPath = path.join(fusionMetadataDir, `${path.parse(file).name}.json`);
    await writeFile(targetPath, JSON.stringify(metadata, null, 2), "utf8");
    await writeFile(fusionTargetPath, JSON.stringify(fusionMetadata, null, 2), "utf8");
  });

  await Promise.all(tasks);
  return { rarity: config.tierLabel, count: files.length };
}

async function main() {
  const results = [];
  for (const rarityKey of Object.keys(shardThemes)) {
    const summary = await generateForRarity(rarityKey);
    results.push(summary);
  }

  console.log("Metadata generation complete:");
  for (const { rarity, count } of results) {
    console.log(`  - ${rarity}: ${count} items`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

