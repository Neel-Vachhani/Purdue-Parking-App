import * as React from "react";
import { FontAwesome } from "@expo/vector-icons";
import { ThemeContext } from "../theme/ThemeProvider";
import { View } from "react-native";


type PaidLotProps = {
  paid: boolean;
};

const PaidLot = (props: PaidLotProps) => {
    const theme = React.useContext(ThemeContext);
    
    if (props.paid) {
        return (
            <View style={{
                marginLeft: -7,
                marginTop: 1.5,
                flexDirection: "row"
            }} >            
                <FontAwesome name="usd" size = {16.5} color={theme.primary}></FontAwesome>
                <FontAwesome name="usd" size = {16.5} color={theme.primary}></FontAwesome>
            </View>
        )
    } else {
        return null;
    }
}

export default PaidLot