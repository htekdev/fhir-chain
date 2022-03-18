async function main() {
    const FHIRAccess = await ethers.getContractFactory("FHIRAccess");
 
    // Start deployment, returning a promise that resolves to a contract object
    const fhir_access = await FHIRAccess.deploy();   
    console.log("Contract deployed to address:", fhir_access.address);
 }
 
 main()
   .then(() => process.exit(0))
   .catch(error => {
     console.error(error);
     process.exit(1);
   });