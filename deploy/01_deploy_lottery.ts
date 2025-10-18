import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const lottery = await deploy("Lottery", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log(`Lottery合约已部署到: ${lottery.address}`);
};

export default func;
func.id = "deploy_lottery";
func.tags = ["Lottery"];

