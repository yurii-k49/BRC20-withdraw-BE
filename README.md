# BRC20-Withdraw-Backend
# brc20-backend
# brc20-backend
# BRC20-withdraw-Backend

in frontend.

src/config.ts
testVersion = false : mainnet
testversion = true : testnet

src/App.tsx

const [network, setNetwork] = useLocalStorage<BitcoinNetworkType>(
"xversenetwork",
BitcoinNetworkType.Mainnet
); : mainnet

const [network, setNetwork] = useLocalStorage<BitcoinNetworkType>(
"xversenetwork",
BitcoinNetworkType.Testnet
); : testnet