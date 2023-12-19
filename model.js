import { default as mongoose, Schema } from "mongoose";

const InscribeSchema = new Schema({
    arrayNumber: Number,
    inscribes: [{ type: String }],
});

export default mongoose.model("inscribe", InscribeSchema);