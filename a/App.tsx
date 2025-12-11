import { NavigationContainer } from "@react-navigation/native";
import {
  createNativeStackNavigator
} from "@react-navigation/native-stack";
import { StripeProvider } from "@stripe/stripe-react-native";
import CheckoutScreen from "components/ui/paymentScreens/CheckoutScreen";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

export type RootStackParamList = {
  Payment: undefined;
};
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <StripeProvider
      publishableKey="pk_test_51SLLlwFgc03xaGHAITphti8SDzPvgZTKsDVXxJkUDNGJVUEgNjPxQS7DcyrZWU4vLGSLiZKvPU64bx8lTsEArdOO00oe1HV3nj"
      merchantIdentifier="merchant.com.CLIENTCOMPANY.app" // Apple Pay merchant ID
      urlScheme="yourapp" // for 3DS / Cash App Pay return_url
    >
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="Payment"
              component={CheckoutScreen}
              options={{ title: "Checkout" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </StripeProvider>
  );
}
