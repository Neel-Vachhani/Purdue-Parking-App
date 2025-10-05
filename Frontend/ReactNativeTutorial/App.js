// Initialize the React framework
import React from "react";
// Import components from React Native
import { StypleSheet, Text, SafeAreaView, SafeAreaView } from "react-native";

// App function = common root function name
// export default = let other files see and be able to import function
export default function App() {
    const textPressed = () => console.log("Text pressed");
    
    return (
        // View = component that lets you group things
        // SafeAreaView = enures our content is in the "safe area" for iPhones (not covered up by the notch)
        <SafeAreaView style={styles.container}>
            {/* numberOfLines = max # of lines the text can go on. Once limit is reached, "..." is shown */}
            {/* onPress = makes text act as a link. Pass in function that says what happens when text is clicked */}
            <Text numberOfLines={1} onPress={handlePress}>
                Hello World
            </Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        // Set flex to 1 = make the style flexibile so it grows vertically and horizontally
        // to fill the entire screen
        flex: 1,
        // Can used named colors or RGB colors
        backgroundColor: "dodgerblue",
        // Allign the items in the container around the center
        // alignItems: "center",
        // justifyContent: "center"
    }
});



