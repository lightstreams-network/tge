const Distribution = artifacts.require("Distribution");

module.exports = function (deployer) {
    let allocationsOpenIn24h = Math.floor(new Date().getTime() / 1000) + 1;

    deployer.deploy(Distribution, allocationsOpenIn24h)
        .then((instance) => {
            console.log("Distribution contract deployed!")
        });
};