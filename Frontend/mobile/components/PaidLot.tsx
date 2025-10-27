import * as React from "react";
import { FontAwesome } from "@expo/vector-icons";
import { ThemeContext } from "../theme/ThemeProvider";


type PaidLotProps = {
  paid: boolean;
};

const PaidLot = (props: PaidLotProps) => {
    
    if (props.paid) {
        return (
            <div>            
                <FontAwesome name="usd" size = {18}></FontAwesome>
            </div>
        )
    } else {
        return null
    }
}

export default PaidLot