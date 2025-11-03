import Config from 'react-native-config';
import GooglePlacesTextInput from 'react-native-google-places-textinput';

const StyledExample = () => {
  const handlePlaceSelect = (place: any) => {
    console.log('Selected place:', place);
  };

  const customStyles = {
    container: {
      width: '100%',
      marginHorizontal: 0,
    },
    input: {
      height: 45,
      borderColor: '#ccc',
      borderRadius: 8,
    },
    suggestionsContainer: {
      backgroundColor: '#ffffff',
      maxHeight: 250,
    },
    suggestionItem: {
      padding: 15,
    },
    suggestionText: {
      main: {
        fontSize: 16,
        color: '#333',
      },
      secondary: {
        fontSize: 14,
        color: '#666',
      }
    },
    loadingIndicator: {
      color: '#999',
    },
    placeholder: {
      color: '#999',
    }
  };

  return (
    <GooglePlacesTextInput
      apiKey={Config.GOOGLE_MAPS_API!}
      placeHolderText="Search for a place"
      onPlaceSelect={handlePlaceSelect}
      fetchDetails={true}
      detailsFields={['formattedAddress', 'location']}
      locationRestriction={{
        rectangle: {
          low: { latitude: 40.39286, longitude: -86.954622},
          high: { latitude: 40.466874, longitude: -86.871755 }
        }
      }}
    />
  );
};