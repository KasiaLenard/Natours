/* eslint-disable */

import axios from "axios";
import { showAlert } from "./alerts";

// type is either 'password' or 'data'
export const updateData = async (data, type) => {
    try {
        const url =
            type === "Password"
                ? "http://localhost:3000/api/v1/users/updatePassword"
                : "http://localhost:3000/api/v1/users/updateMe";

        const res = await axios({
            method: "PATCH",
            url,
            data
        });

        if (res.data.status === "success") {
            showAlert("success", `${type} updated successfully!`);
        }
    } catch (err) {
        showAlert("error", err.response.data.message);
    }
};
