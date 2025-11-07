import React from 'react';
import { View, Text, TextInput, FlatList, StyleSheet } from 'react-native'
import GooglePlacesTextInput from 'react-native-google-places-textinput';

const NavigationView = () => {
  const [places, setPlaces] = React.useState<any[]>([]);

  const customStyles = {
    container: {
      marginHorizontal: 16,
      marginVertical: 8,
    },
    input: {
      backgroundColor: '#fff',
      borderColor: '#ccc',
      borderWidth: 1,
      borderRadius: 10,
      height: 48,
      fontSize: 16,
      color: '#000',
      paddingHorizontal: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    suggestionsContainer: {
      backgroundColor: '#fff',
      borderRadius: 10,
      marginTop: 4,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    suggestionItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomColor: '#eee',
      borderBottomWidth: 1,
    },
    suggestionText: {
      main: {
        fontSize: 15,
        color: '#222',
      },
      secondary: {
        fontSize: 13,
        color: '#777',
      },
    },
    loadingIndicator: {
      color: '#999',
    },
    placeholder: {
      color: '#888',
    },
    text: {
      color: '#000',
    },
  };

  const  handlePlaceSelect = async (place: any) => {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': 'APIKEY',
              'X-Goog-FieldMask': 'places.displayName,places.name,places.googleMapsUri'
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
        renderItem={({ item }) => (
          <View>
            <Text style={styles.innerText}>{item.displayName.text}</Text>
          </View>
        )}
        keyExtractor={(item) => item.googleMapsUri}
      >
      </FlatList>

    </View>
  )}

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    baseText: {
      fontWeight: 'bold',
    },
    innerText: {
      color: 'red',
    },
  });




  return (
    <View>
        <GooglePlacesTextInput
        apiKey="APIKEY"
        placeHolderText="Search for a place"
        onPlaceSelect={handlePlaceSelect}
        fetchDetails={true}
        types={['parking']}
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