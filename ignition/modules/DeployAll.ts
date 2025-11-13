import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { id, parseUnits } from "ethers";
import manifest from "../../ipfs/manifest.json" assert { type: "json" };

const metadataCidDefault =
  (manifest as { metadataCID?: string }).metadataCID ?? "";

const DeployAllModule = buildModule("DeployAll", (m) => {
  const ticketPrice = m.getParameter("ticketPrice", parseUnits("100", 18));
  const minterRole = m.getParameter("minterRole", id("MINTER_ROLE"));
  const metadataCid = m.getParameter("metadataCid", metadataCidDefault);
  const vendorRate = m.getParameter("vendorRate", parseUnits("5000", 18)); // 1 ETH => 5000 DTK
  const synthesisMetadataCid = m.getParameter("synthesisMetadataCid", metadataCidDefault);
  const synthesisRarityLimits = m.getParameter("synthesisRarityLimits", [82, 17, 54, 30] as const);
  const vendorInitialLiquidity = m.getParameter(
    "vendorInitialLiquidity",
    parseUnits("600000", 18),
  );

  const erc20Token = m.contract("ERC20Token", [], {
    id: "Step01_Deploy_ERC20Token",
  });

  const nftCollection = m.contract("NFTCollection", [], {
    id: "Step02_Deploy_NFTCollection",
    after: [erc20Token],
  });

  const blindBox = m.contract(
    "BlindBox",
    [erc20Token, nftCollection, ticketPrice, metadataCid],
    {
      id: "Step03_Deploy_BlindBox",
      after: [erc20Token, nftCollection],
    },
  );

  const tokenVendor = m.contract(
    "TokenVendor",
    [erc20Token, vendorRate],
    {
      id: "Step04_Deploy_TokenVendor",
      after: [erc20Token],
    },
  );

  const cardSynthesis = m.contract(
    "CardSynthesis",
    [erc20Token, nftCollection, synthesisMetadataCid, synthesisRarityLimits],
    {
    id: "Step05_Deploy_CardSynthesis",
    after: [blindBox],
    },
  );

  const marketplace = m.contract("Marketplace", [erc20Token, nftCollection], {
    id: "Step06_Deploy_Marketplace",
    after: [blindBox],
  });

  const seedVendor = m.call(
    erc20Token,
    "transfer",
    [tokenVendor, vendorInitialLiquidity],
    {
      id: "Step07_Seed_TokenVendor",
      after: [tokenVendor],
    },
  );

  const grantMinterRole = m.call(
    nftCollection,
    "grantRole",
    [minterRole, blindBox],
    {
      id: "Step08_Grant_MinterRole",
      after: [blindBox],
    },
  );

  const grantSynthesisMinter = m.call(
    nftCollection,
    "grantRole",
    [minterRole, cardSynthesis],
    {
      id: "Step09_Grant_MinterRole_Synthesis",
      after: [cardSynthesis],
    },
  );

  const verifyErc20Symbol = m.staticCall(
    erc20Token,
    "symbol",
    [],
    undefined,
    {
      id: "Verify01_Check_ERC20Token_Symbol",
      after: [erc20Token],
    },
  );

  const verifyBlindBoxTicketPrice = m.staticCall(
    blindBox,
    "ticketPrice",
    [],
    undefined,
    {
      id: "Verify02_Check_BlindBox_TicketPrice",
      after: [blindBox],
    },
  );

  const verifyMinterRoleGranted = m.staticCall(
    nftCollection,
    "hasRole",
    [minterRole, blindBox],
    undefined,
    {
      id: "Verify03_Check_MinterRole_Granted",
      after: [grantMinterRole],
    },
  );

  const verifyCardSynthesisFee = m.staticCall(
    cardSynthesis,
    "SYNTHESIS_FEE",
    [],
    undefined,
    {
      id: "Verify04_Check_CardSynthesis_Fee",
      after: [cardSynthesis],
    },
  );

  const verifyMarketplaceFeeRate = m.staticCall(
    marketplace,
    "PLATFORM_FEE_RATE",
    [],
    undefined,
    {
      id: "Verify05_Check_Marketplace_FeeRate",
      after: [marketplace],
    },
  );

  const verifyVendorRate = m.staticCall(
    tokenVendor,
    "tokensPerEth",
    [],
    undefined,
    {
      id: "Verify06_Check_TokenVendor_Rate",
      after: [tokenVendor],
    },
  );

  return {
    erc20Token,
    nftCollection,
    blindBox,
    cardSynthesis,
    marketplace,
    tokenVendor,
    seedVendor,
    verifyVendorRate,
    grantSynthesisMinter,
  };
});

export default DeployAllModule;

type DeployAllContracts = Record<
  string,
  {
    address: string;
    contractName: string;
  }
>;

function getContractAddress(
  contracts: DeployAllContracts,
  key: string,
): string | undefined {
  return contracts?.[key]?.address;
}

type HardhatRuntimeEnvironmentLike = {
  run: (
    taskName: string,
    params?: Record<string, unknown>,
  ) => Promise<unknown>;
};

export async function verifyDeployAll(
  hre: HardhatRuntimeEnvironmentLike,
  contracts: DeployAllContracts,
  options?: {
    ticketPrice?: bigint;
    metadataCid?: string;
  },
): Promise<void> {
  const etherscanKey = process.env.ETHERSCAN_API_KEY ?? "";
  if (etherscanKey.trim().length === 0) {
    console.log("⚠️ 未找到 ETHERSCAN_API_KEY，跳过源码验证。");
    return;
  }

  const ticketPrice = options?.ticketPrice ?? parseUnits("100", 18);
  const metadataCid = options?.metadataCid ?? metadataCidDefault;

  const synthesisMetadataCid = metadataCid;
  const synthesisRarityLimits = [82, 17, 54, 30];

  const tasks: Array<{
    label: string;
    address: string | undefined;
    args: unknown[];
  }> = [
    {
      label: "ERC20Token",
      address: getContractAddress(contracts, "erc20Token"),
      args: [],
    },
    {
      label: "NFTCollection",
      address: getContractAddress(contracts, "nftCollection"),
      args: [],
    },
    {
      label: "BlindBox",
      address: getContractAddress(contracts, "blindBox"),
      args: [
        getContractAddress(contracts, "erc20Token"),
        getContractAddress(contracts, "nftCollection"),
        ticketPrice,
        metadataCid,
      ],
    },
    {
      label: "TokenVendor",
      address: getContractAddress(contracts, "tokenVendor"),
      args: [getContractAddress(contracts, "erc20Token"), options?.vendorRate ?? parseUnits("5000", 18)],
    },
    {
      label: "CardSynthesis",
      address: getContractAddress(contracts, "cardSynthesis"),
      args: [
        getContractAddress(contracts, "erc20Token"),
        getContractAddress(contracts, "nftCollection"),
        synthesisMetadataCid,
        synthesisRarityLimits,
      ],
    },
    {
      label: "Marketplace",
      address: getContractAddress(contracts, "marketplace"),
      args: [
        getContractAddress(contracts, "erc20Token"),
        getContractAddress(contracts, "nftCollection"),
      ],
    },
  ];

  for (const task of tasks) {
    if (!task.address) {
      console.log(
        `ℹ️ 跳过 ${task.label} 验证：未找到部署地址（deployment contracts 中缺少 "${task.label}"）。`,
      );
      continue;
    }

    console.log(`🔍 正在验证 ${task.label} (${task.address}) ...`);

    try {
      await hre.run("verify:verify", {
        address: task.address,
        constructorArguments: task.args,
      });
      console.log(`✅ ${task.label} 验证成功`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      if (message.includes("Already Verified") || message.includes("already verified")) {
        console.log(`ℹ️ ${task.label} 已经验证，无需重复提交。`);
      } else {
        console.error(`❌ ${task.label} 验证失败: ${message}`);
      }
    }
  }
}
