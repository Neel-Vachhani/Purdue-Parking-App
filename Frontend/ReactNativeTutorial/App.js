/**
 * Note: This file was written to assist learning while going through a React Native tutorial.
 * This file is NOT meant to be included in the production of our app.
 **/

// Initialize the React framework
import React from "react";
// Import components from React Native
import { StyleSheet, Text, View, Image, SafeAreaView } from "react-native";

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
            <Text numberOfLines={1} onPress={textPressed}> Hello World </Text>
            {/* displaying local image */}
            <Image source={require('./Frontend/ReactNativeTutorial/Frontend/ReactNativeTutorial/tiger.png')} />
            {/* When displaying network images, you must specify dimensions */}
            <Image source = {{ 
                width: 200,
                height: 300,
                uri: "https://picsum.photos/200/300"}} />
            {/* Note: There are many other properities for resizing images, loading images, etc. */}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        // Set flex to 1 = make the style flexibile so it grows vertically and horizontally
        // to fill the entire screen
        flex: 1,
        // Can used named colors or RGB colors
        backgroundColor: "#fff",
        // Allign the items in the container around the center
        alignItems: "center",
        justifyContent: "center"
    }
});



