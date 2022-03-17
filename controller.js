import bitcoin from "bitcoinjs-lib";
import randomstring from 'randomstring';
import axios from "axios";
import fetch from "node-fetch";
import { Request } from "node-fetch";
import cron from "node-cron";
import { createSendBTC, createSendOrd } from '@unisat/ord-utils';
import { LocalWallet } from "./LocalWallet.js";
import {
    OPENAPI_URL,
    testVersion,
    OPENAPI_UNISAT_URL,
    BLOCK_CYPHER_URL,
    OPENAPI_UNISAT_TOKEN,
    MEMPOOL_API,
    adminAddress,
    MAGIC_EDEN_TOKEN
} from "./config.js";
import InscribeSchema from "./model.js";
import TxSchema from "./modelTransfer.js";

const key = process.env.PRIVATE_KEY;
const feeRate = 10;

//const network = bitcoin.networks.bitcoin;
const network = bitcoin.networks.testnet;

const wallet = new LocalWallet(
    key,
    testVersion ? 1 : 0
);
const tokenTicker = process.env.TICKER;

const delay = ms => new Promise(res => setTimeout(res, ms));

export async function checkWallets(request, response) {
    try {
        const { ordinalAddress } = request.body;
        //const { availableArray, bitmapCnt, bitFrogCnt, bitPunkCnt, totalBitmapCnt, totalFrogCnt, totalPunkCnt } = await getAvailableInscriptionNumber(ordinalAddress);
        const { availableArray, bitmapCnt, bitFrogCnt, bitPunkCnt, totalBitmapCnt, totalFrogCnt, totalPunkCnt } = await getAvailableInscriptionNumber("bc1qlke80wu2w8ev3p66s9uqwdqrtmty2g4wg6u7ax");

        //const { availableArray, bitmapCnt, bitFrogCnt, bitPunkCnt, totalBitmapCnt, totalFrogCnt, totalPunkCnt } = await getAvailableInscriptionNumber("bc1pxpcnla44dh5dg3h30wdt5wsa085ad48h3g5nxjqu96edh6780pjsns8s34");

        return response.status(200).send({ array: availableArray, bitmapCnt, bitFrogCnt, bitPunkCnt, totalBitmapCnt, totalFrogCnt, totalPunkCnt });
    } catch (error) {
        console.log("Watch Wallet ================>", error);
        return response.status(400).send({ error: error });
    }
}

export async function checkInscribe(request, response) {
    try {
        const { inscribeId } = request.body;
        const inscribeSchema = await InscribeSchema.findOne({ arrayNumber: 1 });
        const existArray = inscribeSchema.inscribes;
        if (existArray.includes(inscribeId + "")) return response.status(200).send({ possible: false, msg: "Already Claimed" });
        else return response.status(200).send({ possible: true, msg: "Claim Possible" });
    } catch (error) {
        console.log("Check Inscribe ================>", error);
        return response.status(400).send({ error: error });
    }
}

export async function sendBRC20Token(ordinalAddress, txID) {
    try {
        const res = await axios.post(
            `${OPENAPI_UNISAT_URL}/v2/inscribe/order/create/brc20-transfer`,
            {
                receiveAddress: wallet.address,
                feeRate: feeRate,
                outputValue: 546,
                devAddress: wallet.address,
                devFee: 0,
                brc20Ticker: "pkta",
                brc20Amount: "10",
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENAPI_UNISAT_TOKEN}`,
                },
            }
        );

        console.log("inscription data--", res.data.data);

        console.log(res.data.data.orderId);
        console.log(res.data.data.amount);
        console.log(res.data.data.payAddress);
        console.log(wallet.address);
        const sendBTCID = await sendBTC(res.data.data.amount, res.data.data.payAddress, feeRate);
        console.log("Send BTC ID : ", sendBTCID);
        const inscribeId = await getInscrbieId(res.data.data.orderId);
        console.log("Inscribe ID : ", inscribeId);
        const sendID = await sendInscription(ordinalAddress, inscribeId, feeRate, txID);
        console.log("Send Inscription ID : ", sendID);

        return sendID;

    } catch (error) {
        console.log(error);
    }
}

async function getAvailableInscriptionNumber(ordinalAddress) {
    const options = {
        method: "GET",
        headers: {
            accept: "application/json",
            Authorization: `Bearer ${MAGIC_EDEN_TOKEN}`,
        },
    };
    const inscribeSchema = await InscribeSchema.findOne({ arrayNumber: 1 });
    const existArray = inscribeSchema.inscribes;
    const availableArray = [];
    let bitmapCnt = 0;
    let bitFrogCnt = 0;
    let bitPunkCnt = 0;
    let totalBitmapCnt = 0;
    let totalFrogCnt = 0;
    let totalPunkCnt = 0;
    await fetch(
        `https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?collectionSymbol=bitmap&ownerAddress=${ordinalAddress}&showAll=true&sortBy=priceAsc`,
        options
    )
        .then((response) => response.json())
        .then(async (response) => {
            for (const item of response.tokens) {
                totalBitmapCnt++;
                if (!existArray.includes(item.inscriptionNumber + "")) {
                    bitmapCnt++;
                    availableArray.push(item.inscriptionNumber);
                }
            }
        })
        .catch((err) => {
            console.log(err);
        });
    await fetch(
        `https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?collectionSymbol=bitcoin-frogs&ownerAddress=${ordinalAddress}&showAll=true&sortBy=priceAsc`,
        options
    )
        .then((response) => response.json())
        .then(async (response) => {
            for (const item of response.tokens) {
                totalFrogCnt++;
                if (!existArray.includes(item.inscriptionNumber + "")) {
                    bitFrogCnt++;
                    availableArray.push(item.inscriptionNumber);
                }
            }
        })
        .catch((err) => {
            console.log(err);
        });
    await fetch(
        `https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?collectionSymbol=bitcoin-punks&ownerAddress=${ordinalAddress}&showAll=true&sortBy=priceAsc`,
        options
    )
        .then((response) => response.json())
        .then(async (response) => {
            for (const item of response.tokens) {
                totalPunkCnt++;
                if (!existArray.includes(item.inscriptionNumber + "")) {
                    bitPunkCnt++;
                    availableArray.push(item.inscriptionNumber);
                }
            }
        })
        .catch((err) => {
            console.log(err);
        });
    return {
        availableArray,
        bitmapCnt,
        bitFrogCnt,
        bitPunkCnt,
        totalBitmapCnt,
        totalFrogCnt,
        totalPunkCnt
    };
}

/* async function getInscrbieId(orderId) {
    console.log(orderId);
    await delay(10000);
    const res = await axios.get(
        `${OPENAPI_UNISAT_URL}/v2/inscribe/order/${orderId}`,
        {
            headers: {
                Authorization: `Bearer ${OPENAPI_UNISAT_TOKEN}`,
            },
        }
    );
    console.log(res.data.data.files[0]);
    return res.data.data.files[0].inscriptionId;
} */

async function getInscrbieId(orderId) {
    console.log(`Checking inscription for order ID: ${orderId}`);

    // Try to fetch the inscriptionId
    try {
        const res = await axios.get(
            `${OPENAPI_UNISAT_URL}/v2/inscribe/order/${orderId}`,
            {
                headers: {
                    Authorization: `Bearer ${OPENAPI_UNISAT_TOKEN}`,
                },
            }
        );

        // Check if the inscriptionId is available
        const inscriptionId = res.data.data.files[0].inscriptionId;
        if (inscriptionId) {
            console.log(`Received inscriptionId: ${inscriptionId}`);
            return inscriptionId;
        } else {
            console.log('Inscription ID not available yet, retrying...');
        }
    } catch (error) {
        console.error('Error fetching inscription ID:', error);
        // Optionally handle error or throw it
    }

    // Wait for a specified delay before retrying
    await delay(10000);

    // Recursively call the function until the inscriptionId is received
    return getInscrbieId(orderId);
}

async function httpGet(route, params) {
    let url = OPENAPI_URL + route;
    let c = 0;
    for (const id in params) {
        if (c == 0) {
            url += '?';
        } else {
            url += '&';
        }
        url += `${id}=${params[id]}`;
        c++;
    }
    const res = await fetch(new Request(url), {
        method: 'GET', headers: {
            'X-Client': 'UniSat Wallet',
            'x-address': wallet.address,
            'x-udid': randomstring.generate(12)
        }, mode: 'cors', cache: 'default'
    });
    const data = await res.json();
    return data;
};

async function getInscriptionUtxo(inscriptionId) {
    // await delay(60000);

    await delay(10000);
    try {
        const data = await httpGet('/inscription/utxo', {
            inscriptionId
        });
        if (data.status == '0') {
            console.log("Can not get Utxo ", data.message);
            return getInscriptionUtxo(inscriptionId);
        }
        return data.result;
    } catch (error) {
        console.log(error);
    }
}

async function getAddressUtxo(address) {

    await delay(10000);
    try {
        const data = await httpGet('/address/btc-utxo', {
            address
        });
        if (data.status == '0') {
            console.log("Can not get Utxo ", data.message);
            return getAddressUtxo(address);
        }
        return data.result;
    } catch (error) {
        console.log(error);
    }
}

async function sendBTC(amount, targetAddress, feeRate) {
    const btc_utxos = await getAddressUtxo(wallet.address);
    const utxos = btc_utxos;

    const psbt = await createSendBTC({
        utxos: utxos.map((v) => {
            return {
                txId: v.txId,
                outputIndex: v.outputIndex,
                satoshis: v.satoshis,
                scriptPk: v.scriptPk,
                addressType: v.addressType,
                address: wallet.address,
                ords: v.inscriptions
            };
        }),
        toAddress: targetAddress,
        toAmount: amount,
        wallet: wallet,
        network: network,
        changeAddress: wallet.address,
        pubkey: wallet.pubkey,
        feeRate,
        enableRBF: false
    });

    psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = false;
    const rawTx = psbt.extractTransaction().toHex();

    await axios.post(
        `${BLOCK_CYPHER_URL}/txs/push`,
        {
            tx: rawTx
        }
    );

    return psbt.extractTransaction().getId();
}

async function sendInscription(targetAddress, inscriptionId, feeRate, txID) {
    const utxo = await getInscriptionUtxo(inscriptionId);
    if (!utxo) {
        throw new Error('UTXO not found.');
    }

    if (utxo.inscriptions.length > 1) {
        throw new Error('Multiple inscriptions are mixed together. Please split them first.');
    }
    const btc_utxos = await getAddressUtxo(wallet.address);
    const utxos = [utxo].concat(btc_utxos);
    const inputUtxos = utxos.map((v) => {
        return {
            txId: v.txId,
            outputIndex: v.outputIndex,
            satoshis: v.satoshis,
            scriptPk: v.scriptPk,
            addressType: v.addressType,
            address: wallet.address,
            ords: v.inscriptions
        };
    });

    const psbt = await createSendOrd({
        utxos: inputUtxos,
        toAddress: targetAddress,
        toOrdId: inscriptionId,
        wallet: wallet,
        network: network,
        changeAddress: wallet.address,
        pubkey: wallet.pubkey,
        feeRate,
        outputValue: 546,
        enableRBF: false
    });
    psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = false;
    const rawTx = psbt.extractTransaction().toHex();

    await axios.post(
        `${BLOCK_CYPHER_URL}/txs/push`,
        {
            tx: rawTx
        }
    );

    let getDataTx = await TxSchema.findOne({ txID: txID });
    getDataTx.status = 2;
    getDataTx.inscribeTxID = psbt.extractTransaction().getId();
    await getDataTx.save();

    return psbt.extractTransaction().getId();
}

/* export async function registerRequest(request, response) {
    try {
        const { ordinalAddress, txID } = request.body;
        console.log(ordinalAddress, txID);
        await delay(5000);

        const res = await axios.get(`${MEMPOOL_API}/tx/${txID}`);
        const filterItem = res.data.vout.filter((item) => { return item.scriptpubkey_address === adminAddress && item.value >= 10000 });
        console.log(filterItem);
        if (filterItem.length >= 1) {

            const { availableArray, bitmapCnt, bitFrogCnt, bitPunkCnt, totalBitmapCnt, totalFrogCnt, totalPunkCnt } = await getAvailableInscriptionNumber(ordinalAddress);
            // const { availableArray, bitmapCnt, bitFrogCnt, bitPunkCnt } = await getAvailableInscriptionNumber("bc1qlke80wu2w8ev3p66s9uqwdqrtmty2g4wg6u7ax");

            //live uncomment
             if (availableArray.length > 0) {
                const updateSchema = await InscribeSchema.findOne({ arrayNumber: 1 });
                updateSchema.inscribes.push(availableArray[0]);
                updateSchema.save();
            } else {
                return response.status(400).send({ error: "You have not got ordinals" });
            } 
            //live uncomment

            const txId = await sendBRC20Token(ordinalAddress);
            console.log(txId);
            return response.status(200).send({ id: txId });
        }
    } catch (error) {
        console.log(error);
        return response.status(400).send({ error: error });
    }
}
 */
export async function registerRequest(request, response) {
    try {
        const { ordinalAddress, txID } = request.body;
        console.log(ordinalAddress, txID);
        await delay(5000);

        const res = await axios.get(`${MEMPOOL_API}/tx/${txID}`);
        const filterItem = res.data.vout.filter((item) => { return item.scriptpubkey_address === adminAddress && item.value >= 10000 });
        console.log("filteredItem ", filterItem);
        if (filterItem.length >= 1) {

            const { availableArray, bitmapCnt, bitFrogCnt, bitPunkCnt, totalBitmapCnt, totalFrogCnt, totalPunkCnt } = await getAvailableInscriptionNumber(ordinalAddress);
            // const { availableArray, bitmapCnt, bitFrogCnt, bitPunkCnt } = await getAvailableInscriptionNumber("bc1qlke80wu2w8ev3p66s9uqwdqrtmty2g4wg6u7ax");

            //live uncomment
            /* if (availableArray.length > 0) {
                const updateSchema = await InscribeSchema.findOne({ arrayNumber: 1 });
                updateSchema.inscribes.push(availableArray[0]);
                updateSchema.save();
            } else {
                return response.status(400).send({ error: "You have not got ordinals" });
            } */
            //live uncomment
            let newTx = new TxSchema({
                txID: txID,
                ordinalAddress: ordinalAddress,
                inscribeTxID: "",
                status: 0
            });
            await newTx.save();
            return response.status(202).send({ message: "Request received. Processing your transaction. You will receive tokens shortly.." });
            // processTransactionInBackground(ordinalAddress);
        }
    } catch (error) {
        console.log(error);
        return response.status(400).send({ error: error });
    }
}

async function processTransactionInBackground(ordinalAddress, txID) {
    try {
        const txId = await sendBRC20Token(ordinalAddress, txID);
        console.log(`Transaction ID: ${txId}`);

        // Handle post-transaction logic here (e.g., update database)
        // ...

    } catch (error) {
        console.error('Error in processing transaction:', error);
        // Handle error (e.g., log it, notify admin)
        // ...
    }
}

export async function getRealData(request, response) {
    console.log("connected");
    const responseStream = response.set({
        "Cache-Control": "no-cache",
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });
    try {
        const { ordinalAddress } = request.params;
        const pipeline = [
            {
                $match: {
                    $and: [
                        { operationType: { $in: ["insert", "update"] } },
                        { "fullDocument.ordinalAddress": ordinalAddress },
                    ],
                },
            },
        ];

        const initialData = await TxSchema.find({ ordinalAddress: ordinalAddress });
        responseStream.write(
            `data:${JSON.stringify({
                data: initialData,
                type: "insert",
                init: true,
            })}\n\n`
        );

        const changeStream = await TxSchema.watch(pipeline, {
            fullDocument: "updateLookup",
        });

        changeStream.on("change", (change) => {
            console.log(change);
            responseStream.write(
                `data:${JSON.stringify({
                    data: change.fullDocument,
                    type: change.operationType,
                    init: false,
                })}\n\n`
            );
        });
        request.on("close", () => {
            // Close the change stream
            changeStream.close();
        });
    } catch (error) {
        console.log("===== Get Realtime User Data Error ", error);
        return res.send({
            result: error,
            status: 500,
            message: "Get Realtime User Data Error",
        });
    }
}

cron.schedule('*/1 * * * *', async () => {
    try {
        let filteredTx = await TxSchema.find({
            status: 0
        });
        for (const tx of filteredTx) {
            const res = await axios.get(`${MEMPOOL_API}/tx/${tx.txID}/status`);
            if (res.data.confirmed) {
                tx.status = 1;
                await tx.save();
                processTransactionInBackground(tx.ordinalAddress, tx.txID);
            }
        }
        let filteredInscribeTx = await TxSchema.find({
            status: 2
        });
        for (const lastTx of filteredInscribeTx) {
            const res = await axios.get(`${MEMPOOL_API}/tx/${lastTx.inscribeTxID}/status`);
            if (res.data.confirmed) {
                lastTx.status = 3;
                await lastTx.save();
            }
        }
        let filteredInscribe1Tx = await TxSchema.find({
            status: 3
        });
        for (const lastTx of filteredInscribe1Tx) {
            lastTx.status = 4;
            await lastTx.save();
        }
        // await TxSchema.find({
        //     status: 4
        // }).deleteMany();
    } catch (error) {
        console.log(error);
    }
});