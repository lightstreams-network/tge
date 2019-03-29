const Distribution = artifacts.require("Distribution");

const {
    timeTravel,
    convertFromBnToInt,
    convertFromIntToBN,
    VI
} = require('./utils');

// contract('Distribution', () => {
//     it("should deploy the contract", async () => {
//         const instance = await Distribution.deployed();
//
//         assert.isDefined(instance.address, 'contract addr should been stored');
//     });
// });