import { VersionedTransaction } from "@solana/web3.js";
const base64Tx = "ATSoy4ZMB1vz/OJLWJxAhsJx0aDg0tN9wp1MElVoSSp0X62WppnQgR6b8hc0c0tI/5p0rwdsSlxaxJVnsMtV1ASAAQAEDJHQpomDBG1RC3TDW/2H727f/E3agJdyWEoTC3aHpJ1Uk5pDexV4mOF71LQ/yPAgbY8/Q4jKPUhvKE0ForVjtbmvZWSxFDWexWhkY4r+IWiNa7Nb/60dy2CnvHV1Gd4t2te90ZvYebJGUar8P39snv1FpoqF5al7GLJSMr3Aa4/oeDzLEhmjShSYaZh7VGfsIbj8KUtq1zoP4r6EkXnzdIHUE0NG2qDvF9TVTA4o3i1yDPUcRcfIfvhq7jKECfwZWrHgoLzN6hTQ9ZQ7WI1q1KFvLDmKJAV1L40OOFCqgpeeM3TH/I+r5Pm1T4giTO55agESrlvNbDkKbv60fQh9mBoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpjJclj04kifG7PRApFI4NgwtaE5na/xCEBI572Nvp+Fm4mJc0/LOMkWjYU8dTtrikNhDN0yWvu8cv1BU2283CWE5tPPkMAciVlNerGh0Er8UPVsqx8L4VpqhmmElMLg2cBQgCAAF8AwAAAJHQpomDBG1RC3TDW/2H727f/E3agJdyWEoTC3aHpJ1UIAAAAAAAAAA0OWJ3bXRjU3c1b2pIc0ROMkxZcnB4NmZUcWZLZWVENDBgLgAAAAAApQAAAAAAAAAG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqQkEAQwADQEBCgYAAgAOCAkBAQsOAA8DAQIEBQYJEBEMDgcpKwTtCxrJHmJAQg8AAAAAAJP+AQAAAAAAUTsBAAEAAAAAAAAAAAAAAAEJAwEAAAEJAcTrsmxH1X0mdqMX8KwrApwkEJMpr5lIg+vhgWoCNV5OAAYdGQoMFhg=";
try {
    const buffer = Buffer.from(base64Tx, "base64");
    const tx = VersionedTransaction.deserialize(buffer);
    console.log("Recent Blockhash:", tx.message.recentBlockhash);
    console.log("Num Signatures:", tx.signatures.length);
    console.log("Address Table Lookups:", tx.message.addressTableLookups.length);
}
catch (e) {
    console.error("Failed to decode:", e);
}
