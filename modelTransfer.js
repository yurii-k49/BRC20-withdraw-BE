import { default as mongoose, Schema } from "mongoose";

const TxSchema = new Schema({
    txID: String,
    inscribeTxID: String,
    orderID: String,
    inscriptionID: String,
    utxoData: { type: [Object], blackbox: true },
    ordinalAddress: String,
    status: Number,
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at",
    },
});

export default mongoose.model("transaction", TxSchema);