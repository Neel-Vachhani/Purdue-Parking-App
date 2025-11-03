import GooglePlacesTextInput from 'react-native-google-places-textinput';
import { Config } from 'react-native-config';

const GooglePlacesInput = () => {
  const handlePlaceSelect = (place: any) => {
    console.log('Selected place:', place);
  };

  return (

    <GooglePlacesTextInput
      apiKey={ Config.GOOGLE_MAPS_URL! }
      onPlaceSelect={handlePlaceSelect}
    />
  );
};