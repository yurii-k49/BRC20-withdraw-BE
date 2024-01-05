import { default as mongoose, Schema } from "mongoose";

const TxSchema = new Schema({
    txID: String,
    inscribeTxID: String,
    ordinalAddress: String,
    status: Number,
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at",
    },
});

export default mongoose.model("transaction", TxSchema);