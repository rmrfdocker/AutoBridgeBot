const fs = require('fs');
const path = require('path');

const CONFIG_DIR = 'config';
const bridgeFiles = [
    path.join(CONFIG_DIR, "obfs4_ipv4.json"),
    path.join(CONFIG_DIR, "obfs4_ipv6.json"),
    path.join(CONFIG_DIR, "webtunnel_ipv4.json"),
    path.join(CONFIG_DIR, "webtunnel_ipv6.json")
];

function updateBridges() {
    try {
        for (const file of bridgeFiles) {
            if (!fs.existsSync(file)) {
                fs.writeFileSync(file, JSON.stringify({ "bridges": [] }, null, 2));
                console.log(`Created ${file}`);
            } else {
                const data = JSON.parse(fs.readFileSync(file));
                const bridges = data.bridges || [];

                // Use a Map to ensure uniqueness based on the bridge string
                const uniqueBridgesMap = new Map();
                for (const bridgeInfo of bridges) {
                    if (bridgeInfo && typeof bridgeInfo.bridge === 'string') {
                        uniqueBridgesMap.set(bridgeInfo.bridge.trim(), bridgeInfo);
                    }
                }

                // Convert back to an array and sort by the bridge string
                const sortedBridges = [...uniqueBridgesMap.values()].sort((a, b) => {
                    return a.bridge.localeCompare(b.bridge);
                });

                fs.writeFileSync(file, JSON.stringify({ "bridges": sortedBridges }, null, 2));
                console.log(`Sorted and updated ${file} with ${sortedBridges.length} bridges.`);
            }
        }
        console.log("Bridge files checked/updated successfully.");
    } catch (error) {
        console.error(`Error updating bridges: ${error}`);
    }
}

if (require.main === module) {
    updateBridges();
}
