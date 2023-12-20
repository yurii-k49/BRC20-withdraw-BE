import bitcoin from "bitcoinjs-lib";
import randomstring from 'randomstring';
import axios from "axios";
import fetch from "node-fetch";
import { Request } from "node-fetch";
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

const network = bitcoin.networks.testnet;
const wallet = new LocalWallet(
    process.env.PRIVATE_KEY,
    testVersion ? 1 : 0
);

const delay = ms => new Promise(res => setTimeout(res, ms));

export async function checkWallets(request, response) {
    try {
        const { ordinalAddress } = request.body;
        const availableArray = await getAvailableInscriptionNumber(ordinalAddress);
        return response.status(200).send({ array: availableArray });
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

export async function sendBRC20Token(ordinalAddress) {
    try {
        const res = await axios.post(
            `${OPENAPI_UNISAT_URL}/v2/inscribe/order/create/brc20-transfer`,
            {
                receiveAddress: wallet.address,
                feeRate: 10,
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
        console.log(res.data.data.orderId);
        console.log(res.data.data.amount);
        console.log(res.data.data.payAddress);
        console.log(wallet.address);
        const sendBTCID = await sendBTC(res.data.data.amount, res.data.data.payAddress, 10);
        console.log("Send BTC ID : ", sendBTCID);
        const inscribeId = await getInscrbieId(res.data.data.orderId);
        console.log("Inscribe ID : ", inscribeId);
        const sendID = await sendInscription(ordinalAddress, inscribeId, 10);
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
    await fetch(
        `https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?collectionSymbol=bitmap&ownerAddress=${ordinalAddress}&showAll=true&sortBy=priceAsc`,
        options
    )
        .then((response) => response.json())
        .then(async (response) => {
            for (const item of response.tokens) {
                if (!existArray.includes(item.inscriptionNumber + "")) availableArray.push(item.inscriptionNumber);
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
                if (!existArray.includes(item.inscriptionNumber + "")) availableArray.push(item.inscriptionNumber);
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
                if (!existArray.includes(item.inscriptionNumber + "")) availableArray.push(item.inscriptionNumber);
            }
        })
        .catch((err) => {
            console.log(err);
        });
    return availableArray;

}

async function getInscrbieId(orderId) {
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
    const data = await httpGet('/inscription/utxo', {
        inscriptionId
    });
    if (data.status == '0') {
        throw new Error(data.message);
    }
    return data.result;
}

async function getAddressUtxo(address) {
    const data = await httpGet('/address/btc-utxo', {
        address
    });
    if (data.status == '0') {
        throw new Error(data.message);
    }
    return data.result;
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

async function sendInscription(targetAddress, inscriptionId, feeRate) {
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

    return psbt.extractTransaction().getId();
}

export async function registerRequest(request, response) {
    try {
        const { paymentAddress, ordinalAddress, txID } = request.body;
        console.log(paymentAddress, ordinalAddress, txID);

        const res = await axios.get(`${MEMPOOL_API}/tx/${txID}`);
        const filterItem = res.data.vout.filter((item) => { return item.scriptpubkey_address === adminAddress && item.value >= 10000 });
        console.log(filterItem);
        if (filterItem.length >= 1) {

            const availableArray = await getAvailableInscriptionNumber(ordinalAddress);

            if (availableArray.length > 0) {
                const updateSchema = await InscribeSchema.findOne({ arrayNumber: 1 });
                updateSchema.inscribes.push(availableArray[0]);
                updateSchema.save();
            } else {
                return response.status(400).send({ error: "You have not got ordinals" });
            }

            // const txId = await sendBRC20Token(ordinalAddress);
            const txId = await sendBRC20Token("tb1p4zrvzefe6rpdfusjhe6urum83qjmeuhve6x7ln9agtv7fxxlua0qz5hf3v");
            console.log(txId);
            return response.status(200).send({ id: txId });
        }
    } catch (error) {
        console.log(error);
        return response.status(400).send({ error: error });
    }
}