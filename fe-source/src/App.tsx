import { useEffect, useState, useRef } from "react";
import type { Capability } from "sats-connect";
import {
  AddressPurpose,
  BitcoinNetworkType,
  getAddress,
  getCapabilities,
  sendBtcTransaction,
} from "sats-connect";
import axios from "axios";
import { TransactionModel } from "./TransactionModal";
import { Modal } from "./Modal";
import { toaster } from "./Toast";
import { backendURL, adminWallet, payFee, memPoolURL } from "./config";

import CreateFileInscription from "./components/createFileInscription";
import CreateTextInscription from "./components/createTextInscription";
import SendBitcoin from "./components/sendBitcoin";
import SignMessage from "./components/signMessage";
import SignTransaction from "./components/signTransaction";
import { useLocalStorage } from "./useLocalStorage";
import { Loading } from "./Loading";

import "./App.css";
import CreateRepeatInscriptions from "./components/createRepeatInscriptions";
import SignBulkTransaction from "./components/signBulkTransaction";

function App() {
  const [claimAble, setClaimAble] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentAddress, setPaymentAddress] = useLocalStorage("paymentAddress");
  const [inscrbieMessage, setInscribeMessage] = useState("");
  const [inscrbieState, setInscribeState] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [paymentPublicKey, setPaymentPublicKey] =
    useLocalStorage("paymentPublicKey");
  const [ordinalsAddress, setOrdinalsAddress] =
    useLocalStorage("ordinalsAddress");
  const [ordinalsPublicKey, setOrdinalsPublicKey] =
    useLocalStorage("ordinalsPublicKey");
  const [checkInscriptionNumber, setCheckInscriptionNumber] =
    useState<number>();
  const [network, setNetwork] = useLocalStorage<BitcoinNetworkType>(
    "xversenetwork",
    BitcoinNetworkType.Mainnet
  );
  const [uniNetwork, setUniNetwork] = useState("mainnet");
  const [capabilityState, setCapabilityState] = useState<
    "loading" | "loaded" | "missing" | "cancelled"
  >("loading");
  const [capabilities, setCapabilities] = useState<Set<Capability>>();
  const [showAvailableMessage, setShowAvailableMessage] = useState("");
  const [walletType, setWalletType] = useState(0);
  const [unisatInstalled, setUnisatInstalled] = useState(false);
  const selfRef = useRef<{ accounts: string[] }>({
    accounts: [],
  });
  const self = selfRef.current;
  const [accounts, setAccounts] = useState<string[]>([]);
  const [txModelOpen, setTxModelOpen] = useState(false);
  const [txLink, setTxLink] = useState("");

  const unisat = (window as any).unisat;

  useEffect(() => {
    checkAvailable();
  }, [ordinalsAddress, walletType]);

  useEffect(() => {
    checkXVerseAvailability();
  }, [network]);

  useEffect(() => {
    checkUnisatAvailability();
  }, []);

  const checkUnisatAvailability = async () => {
    let unisat = (window as any).unisat;

    for (let i = 1; i < 10 && !unisat; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100 * i));
      unisat = (window as any).unisat;
    }

    if (unisat) {
      setUnisatInstalled(true);
    } else if (!unisat) {
      setUnisatInstalled(false);
    }
  };

  const checkXVerseAvailability = async () => {
    let runs = 0;
    const MAX_RUNS = 20;
    setCapabilityState("loading");

    // the wallet's in-page script may not be loaded yet, so we'll try a few times
    while (runs < MAX_RUNS) {
      try {
        await getCapabilities({
          onFinish(response) {
            setCapabilities(new Set(response));
            setCapabilityState("loaded");
          },
          onCancel() {
            setCapabilityState("cancelled");
          },
          payload: {
            network: {
              type: network,
            },
          },
        });
      } catch (e) {
        runs++;
        if (runs === MAX_RUNS) {
          setCapabilityState("missing");
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  const runCapabilityCheck = async (walletType: number) => {
    if (walletType === 1) {
      if (capabilityMessage !== undefined) {
        toaster("error", "Install XVerse Wallet");
        return false;
      }
    } else if (walletType === 2) {
      if (unisatInstalled === false) {
        toaster("error", "Install Unisat Wallet");
        return false;
      }
    }
  };

  const getBasicInfo = async () => {
    const unisat = (window as any).unisat;
    const [address] = await unisat.getAccounts();
    setOrdinalsAddress(address);

    const publicKey = await unisat.getPublicKey();
    setOrdinalsPublicKey(publicKey);

    const uniNetwork = await unisat.getNetwork();
    setUniNetwork(uniNetwork);
  };

  const handleAccountsChanged = (_accounts: string[]) => {
    try {
      if (_accounts[0].length !== 62) {
        toaster("info", "Change Your Wallet Type To Taproot and Connect Again");
        onWalletDisconnect();
        return;
      }
      self.accounts = _accounts;
      if (_accounts.length > 0) {
        setAccounts(_accounts);

        setOrdinalsAddress(_accounts[0]);

        getBasicInfo();
        setWalletType(2);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleNetworkChanged = (uninetwork: string) => {
    setUniNetwork(uninetwork);
    getBasicInfo();
  };

  const checkAvailable = async () => {
    console.log(ordinalsAddress, walletType);
    if (ordinalsAddress !== undefined && walletType !== 0) {
      const res = await axios.post(`${backendURL}/api/check-wallet`, {
        ordinalAddress: ordinalsAddress,
      });
      console.log(res.data.array);
      if (res.data.array.length === 0) {
        // toaster("info", "Sorry, but you cannot claim any token.");
        if (
          res.data.totalBitmapCnt +
            res.data.totalFrogCnt +
            res.data.totalPunkCnt >
          0
        )
          setShowAvailableMessage(
            `Sorry, You already claimed ${
              (res.data.totalBitmapCnt +
                res.data.totalFrogCnt +
                res.data.totalPunkCnt) *
              1000
            } tokens for ${res.data.totalBitmapCnt} Bitmaps, ${
              res.data.totalFrogCnt
            } Bitfrogs and ${
              res.data.totalPunkCnt
            } BitPunks so can not claim any more.`
          );
        else setShowAvailableMessage("Sorry, but you cannot claim any token.");
        setClaimAble(false);
      } else {
        setShowAvailableMessage(
          `${res.data.bitmapCnt} Bitmaps + ${res.data.bitFrogCnt} Bitfrogs + ${
            res.data.bitPunkCnt
          } BitPunks. Total token claimable - ${
            (res.data.bitmapCnt + res.data.bitFrogCnt + res.data.bitPunkCnt) *
            1000
          }`
        );
        // toaster(
        //   "info",
        //   "You are eligible to claim 1000 tokens because you have BITMAP/FROG/ PUNK"
        // );
        setClaimAble(true);
      }
      // setClaimAble(true);
    }
  };

  const checkInscribeNumber = async () => {
    if (checkInscriptionNumber) {
      const res = await axios.post(`${backendURL}/api/check-inscribe`, {
        inscribeId: checkInscriptionNumber,
      });
      setInscribeState(res.data.possible);
      setInscribeMessage(res.data.msg);
    } else {
      toaster("error", "Input Inscribe Number");
    }
  };

  const onClaimClick = async () => {
    try {
      // const feeRate = await axios.get(
      //   "https://mempool.space/api/v1/fees/recommended"
      // );
      // console.log(feeRate.data.economyFee);

      // await axios.post(`${backendURL}/api/test`, {
      //   paymentAddress: paymentAddress,
      // });
      console.log(ordinalsAddress, walletType);
      if (walletType === 2) {
        const txid = await (window as any).unisat.sendBitcoin(
          adminWallet,
          payFee
        );
        setLoading(true);
        try {
          const res = await axios.post(`${backendURL}/api/claim`, {
            ordinalAddress: ordinalsAddress,
            txID: txid,
          });
          setTxModelOpen(true);
          setTxLink(memPoolURL + res.data.id);
          // toaster("success", `${memPoolURL}${res.data.id}`);
        } catch (error) {
          console.log(error);
          if (error.response) toaster("error", error.response.data.error);
          else toaster("error", "Claim Failed! Please Try Again Later");
        }
        setLoading(false);
      } else if (walletType === 1) {
        await sendBtcTransaction({
          payload: {
            network: {
              type: network,
            },
            recipients: [
              {
                address: adminWallet,
                amountSats: BigInt(payFee),
              },
              // you can add more recipients here
            ],
            senderAddress: paymentAddress!,
          },
          onFinish: async (response) => {
            setLoading(true);
            try {
              const res = await axios.post(`${backendURL}/api/claim`, {
                ordinalAddress: ordinalsAddress,
                txID: response,
              });
              setTxModelOpen(true);
              setTxLink(memPoolURL + res.data.id);
              // toaster("success", `${memPoolURL}${res.data.id}`);
            } catch (error) {
              console.log(error);
              if (error.response) toaster("error", error.response.data.error);
              else toaster("error", "Claim Failed! Please Try Again Later");
            }
            setLoading(false);
          },
          onCancel: () => toaster("error", "Canceled"),
        });
      }
      checkAvailable();
    } catch (error) {
      console.log(error);
    }
  };

  const onWalletDisconnect = () => {
    setPaymentAddress(undefined);
    setPaymentPublicKey(undefined);
    setOrdinalsAddress(undefined);
    setOrdinalsPublicKey(undefined);
    setClaimAble(false);
    setShowAvailableMessage("");
    setWalletType(0);
  };

  const toggleNetwork = () => {
    setNetwork(
      network === BitcoinNetworkType.Testnet
        ? BitcoinNetworkType.Mainnet
        : BitcoinNetworkType.Testnet
    );
    onWalletDisconnect();
  };

  const onConnectClick = async (walletType: number) => {
    let possibility = await runCapabilityCheck(walletType);
    if (possibility === false) return;
    if (walletType === 1) {
      await getAddress({
        payload: {
          purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
          message: "Connect With BRC20 Claim",
          network: {
            type: network,
          },
        },
        onFinish: (response) => {
          const paymentAddressItem = response.addresses.find(
            (address) => address.purpose === AddressPurpose.Payment
          );
          setPaymentAddress(paymentAddressItem?.address);
          setPaymentPublicKey(paymentAddressItem?.publicKey);

          const ordinalsAddressItem = response.addresses.find(
            (address) => address.purpose === AddressPurpose.Ordinals
          );
          setOrdinalsAddress(ordinalsAddressItem?.address);
          setOrdinalsPublicKey(ordinalsAddressItem?.publicKey);
          setWalletType(1);
          setOpenModal(false);
        },
        onCancel: () => toaster("error", "Request Canceled"),
      });
    } else if (walletType === 2) {
      try {
        const result = await unisat.requestAccounts();
        handleAccountsChanged(result);
        setOpenModal(false);
      } catch (error) {
        console.log(error);
      }
    }
  };

  const capabilityMessage =
    capabilityState === "loading"
      ? "Checking capabilities..."
      : capabilityState === "cancelled"
      ? "Capability check cancelled by wallet. Please refresh the page and try again."
      : capabilityState === "missing"
      ? "Could not find an installed Sats Connect capable wallet. Please install a wallet and try again."
      : !capabilities
      ? "Something went wrong with getting capabilities"
      : undefined;

  // if (capabilityMessage) {
  //   return (
  //     <div style={{ padding: 30 }}>
  //       <h1>Sats Connect Test App - {network}</h1>
  //       <div>{capabilityMessage}</div>
  //     </div>
  //   );
  // }

  // if (!isReady) {
  //   return (
  //     <div style={{ padding: 30 }}>
  //       <h1 className="font-junkyardcalibo">
  //         Sats Connect Test App - {network}
  //       </h1>
  //       <div>Please connect your wallet to continue</div>

  //       <div style={{ background: "lightgray", padding: 30, marginTop: 10 }}>
  //         <button style={{ height: 30, width: 180 }} onClick={toggleNetwork}>
  //           Switch Network
  //         </button>
  //         <br />
  //         <br />
  //         <button style={{ height: 30, width: 180 }} onClick={onConnectClick}>
  //           Connect
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="mt-2">
      <div className="h-10 flex justify-between items-center p-5">
        <div>
          <p className="text-2xl">ASATPAD</p>
        </div>
        {/* <button
          className="w-[220px] rounded-lg border-2 border-[#3d7ef6] text-[#3d7ef6] disabled:cursor-not-allowed"
          disabled={capabilityMessage !== undefined}
          onClick={!isReady ? onConnectClick : onWalletDisconnect}
        >
          {capabilityMessage !== undefined
            ? "Install Wallet"
            : !isReady
            ? "Connect"
            : "Disconnect"}
        </button> */}
        <button
          className="w-[220px] rounded-lg border-2 border-[#3d7ef6] text-[#3d7ef6] disabled:cursor-not-allowed"
          onClick={() => {
            ordinalsAddress && walletType !== 0
              ? onWalletDisconnect()
              : setOpenModal(true);
          }}
        >
          {ordinalsAddress && walletType !== 0 ? "Disconnect" : "Connect"}
        </button>
      </div>
      <div className="background-image h-full">
        <div className="lg:flex p-10 lg:p-20 items-center">
          <div>
            <p className="text-4xl">BUILD,</p>
            <p className="text-4xl mt-[10px]">donate and impact</p>
            <p className="text-4xl mt-[10px]">bitcoin oridinals & BRC-20</p>
            <p className="text-2xl text-[#3d7ef6] mt-[10px]">
              ApadSAT-A COMMUNITY-DRIVEN OPEN PLATFORM FOR ORDINALS & BRC-20
            </p>
          </div>
          <img src="/assets/img/HomeIcon.png" alt="Home Icon" />
        </div>
        <div className="flex justify-center">
          {showAvailableMessage !== "" && (
            <p
              className={`max-w-[80%] text-center pb-4 ${
                claimAble === false ? "text-red-600" : "text-green-600"
              }`}
            >
              {showAvailableMessage}
            </p>
          )}
        </div>
        <div className="w-full flex justify-center pb-20">
          <button
            className="claim-button disabled:cursor-not-allowed cursor-pointer"
            disabled={!claimAble || loading}
            onClick={onClaimClick}
          >
            {loading ? "Processing..." : "Claim"}
          </button>
        </div>
      </div>
      <div>
        <div className="flex justify-center">
          <p className="text-2xl p-2 lg:p-10">
            CHECK <span className="text-[#3d7ef6]">INSCRIPTION NUMBER</span>
          </p>
        </div>
        <div className="flex">
          <div className="mb-4 flex mx-auto">
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-3"
              type="number"
              placeholder="Inscription Number"
              onChange={(e) => {
                setCheckInscriptionNumber(Number(e.target.value));
              }}
              value={checkInscriptionNumber}
            />
            <button
              className="w-[180px] h-full rounded-lg border-2 border-[#3d7ef6] text-[#3d7ef6]"
              onClick={checkInscribeNumber}
            >
              Check
            </button>
          </div>
        </div>
        <p
          className={`text-center ${
            inscrbieMessage === "" ? "hidden" : "block"
          } ${inscrbieState === false ? "text-red-600" : "text-green-600"}`}
        >
          {inscrbieMessage}
        </p>
      </div>
      <div>
        <div className="flex justify-center">
          <p className="text-2xl p-2 lg:p-10">
            HOW IT <span className="text-[#3d7ef6]">WORKS</span>
          </p>
        </div>
        <div className="flex justify-center">
          <div className="container rounded-2xl">
            <div className="w-full">
              <div className="lg:flex">
                <div className="lg:mr-[10px] bg-white rounded-xl p-6 w-full">
                  <div className="flex">
                    <img
                      src="/assets/img/HowIcon1.png"
                      alt="HowIcon1"
                      className="w-[30px] mr-[10px]"
                    />
                    <p className="text-xl">BUILDERS</p>
                  </div>
                  <ul>
                    <li className="flex mt-2">
                      <img
                        src="/assets/img/HowIcon6.png"
                        className="w-[20px] h-[20px] mt-[1px] mr-3"
                        alt="HowIcon6"
                      />
                      <p>
                        APPLY FOR INITIAL FUNDING ASSISTANCE FOR YOUR INOOVATIVE
                        STARTUP PROJECT AND BOOST ITS IMPACT.
                      </p>
                    </li>
                    <li className="flex mt-2">
                      <img
                        src="/assets/img/HowIcon6.png"
                        className="w-[20px] h-[20px] mt-[1px] mr-3"
                        alt="HowIcon6"
                      />
                      <p>
                        APPLY FOR INITIAL FUNDING ASSISTANCE FOR YOUR INOOVATIVE
                        STARTUP PROJECT AND BOOST ITS IMPACT.
                      </p>
                    </li>
                    <li className="flex mt-2">
                      <img
                        src="/assets/img/HowIcon6.png"
                        className="w-[20px] h-[20px] mt-[1px] mr-3"
                        alt="HowIcon6"
                      />
                      <p>
                        APPLY FOR INITIAL FUNDING ASSISTANCE FOR YOUR INOOVATIVE
                        STARTUP PROJECT AND BOOST ITS IMPACT.
                      </p>
                    </li>
                  </ul>
                </div>
                <div className="lg:ml-[10px] bg-white rounded-xl p-6 w-full mt-5 lg:mt-0">
                  <div className="flex">
                    <img
                      src="/assets/img/HowIcon2.png"
                      alt="HowIcon1"
                      className="w-[30px] mr-[10px]"
                    />
                    <p className="text-xl">BUILDERS</p>
                  </div>
                  <ul>
                    <li className="flex mt-2">
                      <img
                        src="/assets/img/HowIcon6.png"
                        className="w-[20px] h-[20px] mt-[1px] mr-3"
                        alt="HowIcon6"
                      />
                      <p>
                        APPLY FOR INITIAL FUNDING ASSISTANCE FOR YOUR INOOVATIVE
                        STARTUP PROJECT AND BOOST ITS IMPACT.
                      </p>
                    </li>
                    <li className="flex mt-2">
                      <img
                        src="/assets/img/HowIcon6.png"
                        className="w-[20px] h-[20px] mt-[1px] mr-3"
                        alt="HowIcon6"
                      />
                      <p>
                        APPLY FOR INITIAL FUNDING ASSISTANCE FOR YOUR INOOVATIVE
                        STARTUP PROJECT AND BOOST ITS IMPACT.
                      </p>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 w-full mt-5">
                <div className="flex">
                  <img
                    src="/assets/img/HowIcon3.png"
                    alt="HowIcon3"
                    className="w-[30px] mr-[10px]"
                  />
                  <p className="text-xl">PROTOCOLS</p>
                </div>
                <p className="mt-2">
                  APPLY FOR INITIAL FUNDING ASSISTANCE FOR YOUR INOOVATIVE
                  STARTUP PROJECT AND BOOST ITS IMPACT.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 w-full mt-5">
                <div className="flex">
                  <img
                    src="/assets/img/HowIcon4.png"
                    alt="HowIcon4"
                    className="w-[30px] mr-[10px]"
                  />
                  <p className="text-xl">INFRASTRUCTURE</p>
                </div>
                <p className="mt-2">
                  APPLY FOR INITIAL FUNDING ASSISTANCE FOR YOUR INOOVATIVE
                  STARTUP PROJECT AND BOOST ITS IMPACT.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 w-full mt-5">
                <div className="flex">
                  <img
                    src="/assets/img/HowIcon5.png"
                    alt="HowIcon5"
                    className="w-[30px] mr-[10px]"
                  />
                  <p className="text-xl">COMMUNITY</p>
                </div>
                <p className="mt-2">
                  APPLY FOR INITIAL FUNDING ASSISTANCE FOR YOUR INOOVATIVE
                  STARTUP PROJECT AND BOOST ITS IMPACT.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mb-20">
        <div className="flex justify-center">
          <p className="text-2xl p-2 lg:p-10">
            WHAT IS <span className="text-[#3d7ef6]">BRC-20</span>?
          </p>
        </div>
        <div className="lg:flex px-5 lg:px-40 items-center">
          <img
            src="/assets/img/bitcoin.png"
            className="mx-auto lg:mr-16"
            alt="Bitcoin"
          />
          <p className="lg:mt-0 mt-6">
            THE BRC-20 TOKEN STANDARD: IS AN EXPERIEMENTAL FUNGIBLE TOKEN
            CREATED USING ORDINALS AND INSCRIPTIONS AND SAVED ON THE BITCOIN
            BASE CHAIN. IT UTILISES ORDINAL INSCRIPTIONS OF JSON DATA TO DEPLOY
            TOKEN CONTRACTS, MINT TOKENS, AND TRANSFER TOKENS.
            <br />
            <br />
            THE BRC-20 TOKEN STANDARD: IS AN EXPERIEMENTAL FUNGIBLE TOKEN
            CREATED USING ORDINALS AND INSCRIPTIONS AND SAVED ON THE BITCOIN
            BASE CHAIN. IT UTILISES ORDINAL INSCRIPTIONS OF JSON DATA TO DEPLOY
            TOKEN CONTRACTS, MINT TOKENS, AND TRANSFER TOKENS.
          </p>
        </div>
      </div>
      <Modal
        isOpen={openModal}
        toggleModal={setOpenModal}
        walletConnect={onConnectClick}
      />
      <TransactionModel
        isOpen={txModelOpen}
        toggleModal={setTxModelOpen}
        link={txLink}
      />
      {loading && <Loading />}
    </div>
    //   <div style={{ padding: 30 }}>
    //     <h1>Sats Connect Test App - {network}</h1>
    //     <div>
    //       <div>Payment Address: {paymentAddress}</div>
    //       <div>Payment Publickey: {paymentPublicKey}</div>
    //       <div>Ordinals Address: {ordinalsAddress}</div>
    //       <div>Ordinals PublicKey: {ordinalsPublicKey}</div>
    //       <br />

    //       <div className="container">
    //         <h3>Disconnect wallet</h3>
    //         <button onClick={onWalletDisconnect}>Disconnect</button>
    //       </div>
    //       {isReady && <button onClick={onClaimClick}>Claim</button>}
    //       {/*
    //       <SignTransaction
    //         paymentAddress={paymentAddress}
    //         paymentPublicKey={paymentPublicKey}
    //         ordinalsAddress={ordinalsAddress}
    //         ordinalsPublicKey={ordinalsPublicKey}
    //         network={network}
    //         capabilities={capabilities!}
    //       />

    //       <SignBulkTransaction
    //         paymentAddress={paymentAddress}
    //         paymentPublicKey={paymentPublicKey}
    //         ordinalsAddress={ordinalsAddress}
    //         ordinalsPublicKey={ordinalsPublicKey}
    //         network={network}
    //         capabilities={capabilities!}
    //       />

    //       <SignMessage
    //         address={ordinalsAddress}
    //         network={network}
    //         capabilities={capabilities!}
    //       />

    //       <SendBitcoin
    //         address={paymentAddress}
    //         network={network}
    //         capabilities={capabilities!}
    //       />

    //       <CreateTextInscription network={network} capabilities={capabilities!} />

    //       <CreateRepeatInscriptions
    //         network={network}
    //         capabilities={capabilities!}
    //       />

    //       <CreateFileInscription network={network} capabilities={capabilities!} />
    // */}
    //     </div>
    //   </div>
  );
}

export default App;
