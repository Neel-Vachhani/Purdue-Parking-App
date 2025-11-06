import React from 'react';
import { View, Text, TextInput, FlatList, StyleSheet } from 'react-native'
import GooglePlacesTextInput from './map/GooglePlacesInput';
import StyledGooglePlacesTextInput from './map/GooglePlacesInput';

const NavigationView = () => {
  const [places, setPlaces] = React.useState<any[]>([]);

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
        <GooglePlacesTextInput></GooglePlacesTextInput>
        {places && places.length > 0 && (
        <NavigationListView places={places} /> )}
    </View>
  )
}

export default NavigationView