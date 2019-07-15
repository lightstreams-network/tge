const Distribution = artifacts.require("Distribution");

module.exports = function(deployer) {
  let allocationsOpenInOneSec = Math.floor(new Date().getTime() / 1000) + 1;
  let allocationsOpenIn24h = Math.floor(new Date().getTime() / 1000 + (3600 * 24));

  deployer.deploy(Distribution, allocationsOpenInOneSec)
    .then((instance) => {
      console.log("Distribution contract deployed!")
    });
};