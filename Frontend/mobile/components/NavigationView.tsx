import React from 'react';
import { View, Text, FlatList, StyleSheet, Button, Linking } from 'react-native'
import GooglePlacesTextInput from 'react-native-google-places-textinput';
import { ThemeContext } from '../theme/ThemeProvider';

const NavigationView = () => {
  const [places, setPlaces] = React.useState<any[]>([]);
  const theme = React.useContext(ThemeContext);

  const customStyles = React.useMemo(() => ({
    container: {
      marginHorizontal: 16,
      marginVertical: 8,
    },
    input: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 10,
      height: 48,
      fontSize: 16,
      color: theme.text,
      paddingHorizontal: 12,
      elevation: 2,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    suggestionsContainer: {
      backgroundColor: theme.surface,
      borderRadius: 10,
      marginTop: 4,
      elevation: 3,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    suggestionItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomColor: theme.borderMuted,
      borderBottomWidth: 1,
    },
    suggestionText: {
      main: {
        fontSize: 15,
        color: theme.text,
      },
      secondary: {
        fontSize: 13,
        color: theme.textMuted,
      },
    },
    loadingIndicator: {
      color: theme.textMuted,
    },
    placeholder: {
      color: theme.textMuted,
    },
    text: {
      color: theme.text,
    },
  }), [theme]);

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        outerContainer: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
        },
        leftContainer: {
          flex: 1,
          flexGrow: 6,
        },
        rightContainer: {
          flex: 2,
        },
        baseText: {
          fontWeight: 'bold',
        },
        innerText: {
          color: theme.text,
          fontSize: 20,
        },
        address: {
          color: theme.textMuted,
          fontSize: 16,
        },
        button: {
          color: theme.primary,
          textAlign: 'center',
          alignItems: 'center',
        },
        divider: {
          borderBottomColor: theme.borderMuted,
          borderBottomWidth: 2,
          alignSelf: 'stretch',
        },
      }),
    [theme]
  );
  

  const  handlePlaceSelect = async (place: any) => {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': 'APIKEY',
              'X-Goog-FieldMask': 'places.displayName,places.name,places.googleMapsUri,places.formattedAddress'
            },
            body: JSON.stringify({
                includedTypes: ["parking"],
                maxResultCount: 5,
                rankPreference: "DISTANCE",
                locationRestriction: {
                  circle: {
                    center: {
                      latitude: place.details.location.latitude,
                      longitude: place.details.location.longitude
                    },
                    radius: 1000
                  }
                }
              }
            ),
          });
        const duration = await response.json();
        setPlaces(duration.places);
        console.log(duration.places);

  };

  const NavigationListView = ({ places }: { places: any[] }) => {
    
    return (
    <View>
      <FlatList
        data={places}
        ItemSeparatorComponent={() => <View style={{height: 20}} />}
        renderItem={({ item }) => (
          <View style={styles.outerContainer}>
            
            <View style={styles.leftContainer}>
              <Text style={styles.innerText}>{item.displayName.text}</Text>
              <Text style = {styles.address}>{item.formattedAddress}</Text>
            </View>
            <View style={styles.rightContainer}>
              <Button
                title='Directions'
                onPress={() => Linking.openURL(item.googleMapsUri)}
                color={theme.primary}
              />
            </View>
            <View style={styles.divider}></View>
          </View>
        )}
        keyExtractor={(item) => item.googleMapsUri}
      >
      </FlatList>

    </View>
  )}

  return (
    <View>
        <GooglePlacesTextInput
        apiKey="APIKEY"
        placeHolderText="Search for a place"
        onPlaceSelect={handlePlaceSelect}
        fetchDetails={true}
        detailsFields={['formattedAddress', 'location', 'displayName']}
        style={customStyles}
        locationRestriction={{
          rectangle: {
            low: { latitude: 40.39286, longitude: -86.954622 },
            high: { latitude: 40.466874, longitude: -86.871755 },
          },
        }}>

        </GooglePlacesTextInput>
        {places && places.length > 0 && (
        <NavigationListView places={places} /> )}
    </View>
  )
}

export default NavigationView