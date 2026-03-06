import {
  View,
  TextInput,
  Text,
  Image,
  Pressable,
  ScrollView,
} from "react-native";
import { useForm } from "@tanstack/react-form";
import * as ImagePicker from "expo-image-picker";
import { Polaroid, Mail, Phone, IdBadge, MapPin } from "../assets/icons";
import { uploadToCloudinary } from "../src/utils/uploadImage.js";
import registerUser from "../src/users/lib/register.js";
import Toast from "react-native-toast-message";

//import { z } from "zod";

export default function Sandbox() {
  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      last_name: "",
      image_profile: "",
      phone: "",
      document_number: "",
      address: "",
    },
    onSubmit: async (values) => {
      console.log(values.value);
      try {
        await registerUser(values.value);
        Toast.show({
          type: "success",
          text1: "Usuario registrado exitosamente",
          position: "bottom",
          visibilityTime: 2000,
        });
        form.reset();
      } catch (error) {
        Toast.show({
          type: "error",
          text1: error.message,
          position: "bottom",
          visibilityTime: 2000,
        });
      }
    },
  });
  return (
    <ScrollView
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
      contentClassName="flex"
      contentContainerClassName=" flex-grow items-center justify-center px-6"
    >
      <View className=" flex flex-col items-center w-full my-4">
        <form.Field name="options.data.image_profile">
          {(field) => (
            <>
              <Pressable
                onPress={async () => {
                  const { status } =
                    await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== "granted") {
                    alert(
                      "Disculpa, necesitamos permisos para acceder a la galeria"
                    );
                    return;
                  }
                  let result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ["images"],
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 1,
                  });
                  if (!result.canceled) {
                    const URL = await uploadToCloudinary(result.assets[0].uri);
                    field.handleChange(URL);
                    console.log(URL);
                  }
                }}
                className="flex items-center justify-center"
              >
                {field.state.value ? (
                  <Image
                    source={{ uri: field.state.value ?? "" }}
                    className="rounded-full"
                    width={64}
                    height={64}
                    resizeMode="cover"
                  />
                ) : (
                  <View className="flex items-center justify-center bg-lime-500/40 dark:bg-lime-500 p-6 rounded-full">
                    <Polaroid
                      className="text-slate-400"
                      width={32}
                      height={32}
                    />
                  </View>
                )}
                <Text className="text-slate-700 dark:text-slate-300 text-2xl font-lexend font-extrabold">
                  Foto de perfil
                </Text>
                <Text className="text-slate-700 dark:text-slate-300 text-xs font-lexend-light">
                  Seleccionar Imagen
                </Text>
              </Pressable>
            </>
          )}
        </form.Field>
      </View>
      <View className=" flex flex-col w-full mt-2">
        <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
          Nombre(s)
        </Text>
        <form.Field
          name="name"
          //validators={{ onChange: z.string().min(3, "Nombre requerido") }}
        >
          {(field) => (
            <>
              <TextInput
                placeholder="Ej: Juan pablo"
                placeholderTextColor={"#9ca3af"}
                className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md py-4 px-6"
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
              />
              {field.state.meta.errors ? (
                <Text className="text-red-500">
                  {field.state.meta.errors.join(", ")}
                </Text>
              ) : null}
            </>
          )}
        </form.Field>
      </View>
      <View className=" flex flex-col w-full">
        <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
          Apellido(s)
        </Text>
        <form.Field name="last_name">
          {(field) => (
            <>
              <TextInput
                placeholder="Ej: Perez Garcia"
                placeholderTextColor={"#9ca3af"}
                className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md py-4 px-6"
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
              />
              {field.state.meta.errors ? (
                <Text className="text-red-500">
                  {field.state.meta.errors.join(", ")}
                </Text>
              ) : null}
            </>
          )}
        </form.Field>
      </View>
      <View className=" flex flex-col w-full">
        <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
          Correo Electronico
        </Text>
        <form.Field name="email">
          {(field) => (
            <View className="relative flex flex-col w-full ">
              <TextInput
                placeholder="  juan.perez@ejemplo.com"
                placeholderTextColor={"#9ca3af"}
                className="flex-1 w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md py-4 px-6"
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
              />
              {field.state.value === "" && (
                <View className="absolute top-0 translate-y-1/2 mt-2 ml-2">
                  <Mail color="#9ca3af" size={18} style={{ marginRight: -5 }} />
                </View>
              )}
              {field.state.meta.errors ? (
                <Text className="text-red-500">
                  {field.state.meta.errors.join(", ")}
                </Text>
              ) : null}
            </View>
          )}
        </form.Field>
      </View>
      <View className=" flex flex-col w-full">
        <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
          Telefono
        </Text>
        <form.Field name="phone">
          {(field) => (
            <View className="relative flex flex-col w-full ">
              <TextInput
                placeholder="  Ej: 123456789"
                placeholderTextColor={"#9ca3af"}
                className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md py-4 px-6"
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
              />
              {field.state.value === "" && (
                <View className="absolute top-0 translate-y-1/2 mt-2 ml-2">
                  <Phone
                    color="#9ca3af"
                    size={18}
                    style={{ marginRight: -5 }}
                  />
                </View>
              )}
              {field.state.meta.errors ? (
                <Text className="text-red-500">
                  {field.state.meta.errors.join(", ")}
                </Text>
              ) : null}
            </View>
          )}
        </form.Field>
      </View>
      <View className=" flex flex-col w-full">
        <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
          N° de Documento
        </Text>
        <form.Field name="document_number">
          {(field) => (
            <View className="relative flex flex-col w-full ">
              <TextInput
                placeholder="  Ej: 123456789"
                placeholderTextColor={"#9ca3af"}
                className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md py-4 px-6"
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
              />
              {field.state.value === "" && (
                <View className="absolute top-0 translate-y-1/2 mt-2 ml-2">
                  <IdBadge
                    color="#9ca3af"
                    size={18}
                    style={{ marginRight: -5 }}
                  />
                </View>
              )}
              {field.state.meta.errors ? (
                <Text className="text-red-500">
                  {field.state.meta.errors.join(", ")}
                </Text>
              ) : null}
            </View>
          )}
        </form.Field>
      </View>
      <View className=" flex flex-col w-full">
        <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
          Direccion
        </Text>
        <form.Field name="address">
          {(field) => (
            <View className="relative flex flex-col w-full ">
              <TextInput
                placeholder="  Ej: Calle 123"
                placeholderTextColor={"#9ca3af"}
                className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md py-4 px-6"
                value={field.state.value}
                onChangeText={(value) => field.handleChange(value)}
              />
              {field.state.value === "" && (
                <View className="absolute top-0 translate-y-1/2 mt-2 ml-2">
                  <MapPin
                    color="#9ca3af"
                    size={18}
                    style={{ marginRight: -5 }}
                  />
                </View>
              )}
              {field.state.meta.errors ? (
                <Text className="text-red-500">
                  {field.state.meta.errors.join(", ")}
                </Text>
              ) : null}
            </View>
          )}
        </form.Field>
        <form.Subscribe>
          {({ canSubmit, isSubmitting }) => (
            <View className="flex flex-col w-3/4 mx-auto mb-32 mt-4">
              <Pressable
                onPress={() => form.handleSubmit()}
                disabled={!canSubmit}
                className="bg-ui-secondary-light dark:bg-ui-secondary-dark focus:bg-ui-secondary-pressed-light dark:focus:bg-ui-secondary-pressed-dark  flex items-center justify-center w-full p-4 rounded-md disabled:opacity-50"
              >
                <Text className="text-center text-ui-main-light dark:text-ui-main-dark font-lexend-ebold">
                  {isSubmitting ? "Enviando..." : "Registrar"}
                </Text>
              </Pressable>
            </View>
          )}
        </form.Subscribe>
      </View>
    </ScrollView>
  );
}
