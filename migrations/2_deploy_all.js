const TeamDistribution = artifacts.require("TeamDistribution");

module.exports = function (deployer) {
    let allocationsOpenIn24h = Math.floor(new Date().getTime() / 1000 + (3600 * 24));

    deployer.deploy(TeamDistribution, allocationsOpenIn24h)
        .then((instance) => {
            console.log("Distribution contract deployed!")
        });
};