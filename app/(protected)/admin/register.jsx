import {
  View,
  TextInput,
  Text,
  Image,
  Pressable,
  ScrollView,
  Animated,
} from "react-native";
import { useRef } from "react";
import { useKeyboardScroll } from "../../../src/hooks/useKeyboardScroll.js";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import Toast from "react-native-toast-message";
import { supabase } from "../../../src/database/supabase";

import * as ImagePicker from "expo-image-picker";
import {
  Polaroid,
  Mail,
  Phone,
  IdBadge,
  MapPin,
  UserPlus,
} from "../../../assets/icons.jsx";
import { uploadToCloudinary } from "../../../src/utils/uploadFileToCloudinary.js";

export default function Sandbox() {
  const { scrollViewRef, keyboardHeight, scrollToField, scrollToEnd } =
    useKeyboardScroll();

  // refs para cada campo
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const documentRef = useRef(null);
  const addressRef = useRef(null);

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
    onSubmit: async ({ value }) => {
      console.log(value);

      const response = await supabase.functions.invoke("crear-socio", {
        body: value,
      });

      if (response.error) {
        let errorMsg =
          "Ha ocurrido un error inesperado. Por favor intentá de nuevo.";
        // Intentamos extraer el mensaje traducido del cuerpo de la respuesta
        if (response.error.context) {
          try {
            const body = await response.error.context.json();
            if (body && body.error) {
              errorMsg = body.error;
            }
          } catch (error) {
            console.log("No se pudo leer el cuerpo del error", error);
          }
        }

        Toast.show({
          type: "error",
          text1: errorMsg,
          position: "bottom",
          visibilityTime: 2500,
        });
        return;
      }
      Toast.show({
        type: "success",
        text1: "Usuario registrado exitosamente",
        position: "bottom",
        visibilityTime: 2000,
      });
      form.reset();
    },
  });

  return (
    <View className="flex-1 bg-ui-background-light dark:bg-ui-background-dark">
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className=" flex flex-col items-center w-full my-4">
          <form.Field name="image_profile">
            {(field) => (
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
                  }
                }}
                className="flex items-center justify-center"
              >
                {field.state.value ? (
                  <Image
                    source={{ uri: field.state.value }}
                    className="rounded-full w-16 h-16"
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
            )}
          </form.Field>
        </View>

        {/* NOMBRE */}
        <View className=" flex flex-col w-full my-2">
          <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
            Nombre(s)
          </Text>
          <form.Field
            name="name"
            validators={{
              onChange: z
                .string()
                .min(3, "El nombre debe tener al menos 3 caracteres")
                .regex(
                  /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/,
                  "El nombre solo puede contener letras"
                ),
            }}
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
                {field.state.meta.errors.length > 0 ? (
                  <Text className="text-cyan-500 text-sm">
                    {field.state.meta.errors[0]?.message}
                  </Text>
                ) : null}
              </>
            )}
          </form.Field>
        </View>

        {/* APELLIDO */}
        <View className=" flex flex-col w-full mt-2">
          <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
            Apellido(s)
          </Text>
          <form.Field
            name="last_name"
            validators={{
              onChange: z.string().min(2, "El apellido es requerido"),
            }}
          >
            {(field) => (
              <>
                <TextInput
                  placeholder="Ej: Perez Garcia"
                  placeholderTextColor={"#9ca3af"}
                  className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md py-4 px-6"
                  value={field.state.value}
                  onChangeText={(value) => field.handleChange(value)}
                />
                {field.state.meta.errors.length > 0 ? (
                  <Text className="text-cyan-500 text-sm">
                    {field.state.meta.errors[0]?.message}
                  </Text>
                ) : null}
              </>
            )}
          </form.Field>
        </View>

        {/* EMAIL */}
        <View ref={emailRef} className=" flex flex-col w-full mt-2">
          <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
            Correo Electronico
          </Text>
          <form.Field
            name="email"
            validators={{
              onChange: z.string().email("Correo electrónico inválido"),
            }}
          >
            {(field) => (
              <>
                <TextInput
                  placeholder="  juan.perez@ejemplo.com"
                  placeholderTextColor={"#9ca3af"}
                  className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md py-4 px-6"
                  value={field.state.value}
                  onChangeText={(value) => field.handleChange(value)}
                  onFocus={() => scrollToField(emailRef)}
                />
                {field.state.value === "" && (
                  <View className="absolute top-6 translate-y-1/2 mt-2 ml-2">
                    <Mail
                      color="#9ca3af"
                      size={18}
                      style={{ marginRight: -5 }}
                    />
                  </View>
                )}
                {field.state.meta.errors.length > 0 ? (
                  <Text className="text-cyan-500 text-sm">
                    {field.state.meta.errors[0]?.message}
                  </Text>
                ) : null}
              </>
            )}
          </form.Field>
        </View>

        {/* TELEFONO */}
        <View ref={phoneRef} className=" flex flex-col w-full mt-2">
          <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
            Telefono
          </Text>
          <form.Field
            name="phone"
            validators={{
              onChange: z.string().min(8, "Número de teléfono inválido"),
            }}
          >
            {(field) => (
              <>
                <TextInput
                  placeholder="  Ej: 123456789"
                  placeholderTextColor={"#9ca3af"}
                  className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md py-4 px-6"
                  value={field.state.value}
                  onChangeText={(value) => field.handleChange(value)}
                  keyboardType="numeric"
                  onFocus={() => scrollToField(phoneRef)}
                />
                {field.state.value === "" && (
                  <View className="absolute top-6 translate-y-1/2 mt-2 ml-2">
                    <Phone
                      color="#9ca3af"
                      size={18}
                      style={{ marginRight: -5 }}
                    />
                  </View>
                )}
                {field.state.meta.errors.length > 0 ? (
                  <Text className="text-cyan-500 text-sm">
                    {field.state.meta.errors[0]?.message}
                  </Text>
                ) : null}
              </>
            )}
          </form.Field>
        </View>

        {/* DOCUMENTO */}
        <View ref={documentRef} className=" flex flex-col w-full mt-2">
          <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
            N° de Documento
          </Text>
          <form.Field
            name="document_number"
            validators={{
              onChange: z.string().min(5, "N° de documento inválido"),
            }}
          >
            {(field) => (
              <>
                <TextInput
                  placeholder="  Ej: 123456789"
                  placeholderTextColor={"#9ca3af"}
                  className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md py-4 px-6"
                  value={field.state.value}
                  onChangeText={(value) => field.handleChange(value)}
                  keyboardType="numeric"
                  onFocus={() => scrollToField(documentRef)}
                />
                {field.state.value === "" && (
                  <View className="absolute top-6 translate-y-1/2 mt-2 ml-2">
                    <IdBadge
                      color="#9ca3af"
                      size={18}
                      style={{ marginRight: -5 }}
                    />
                  </View>
                )}
                {field.state.meta.errors.length > 0 ? (
                  <Text className="text-cyan-500 text-sm">
                    {field.state.meta.errors[0]?.message}
                  </Text>
                ) : null}
              </>
            )}
          </form.Field>
        </View>

        {/* DIRECCION */}
        <View ref={addressRef} className=" flex flex-col w-full mt-2">
          <Text className="text-slate-700 dark:text-slate-300 text-sm mb-2">
            Direccion
          </Text>
          <form.Field name="address">
            {(field) => (
              <>
                <TextInput
                  placeholder="  Ej: Calle 123"
                  placeholderTextColor={"#9ca3af"}
                  className="flex w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-md py-4 px-6"
                  value={field.state.value}
                  onChangeText={(value) => field.handleChange(value)}
                  onFocus={() => {
                    scrollToField(addressRef);
                    scrollToEnd();
                  }}
                />
                {field.state.value === "" && (
                  <View className="absolute top-6 translate-y-1/2 mt-2 ml-2">
                    <MapPin
                      color="#9ca3af"
                      size={18}
                      style={{ marginRight: -5 }}
                    />
                  </View>
                )}
                {field.state.meta.errors.length > 0 ? (
                  <Text className="text-cyan-500 text-sm">
                    {field.state.meta.errors[0]?.message}
                  </Text>
                ) : null}
              </>
            )}
          </form.Field>
        </View>

        {/* BOTON REGISTRAR */}
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <View className="flex w-3/4 mx-auto mb-10 mt-14">
              <Pressable
                onPress={() => form.handleSubmit()}
                disabled={!canSubmit}
                className="flex-row bg-ui-secondary-light dark:bg-ui-secondary-dark focus:bg-ui-secondary-pressed-light dark:focus:bg-ui-secondary-pressed-dark  flex items-center justify-center w-full p-4 rounded-md disabled:opacity-50"
              >
                <UserPlus
                  className="text-ui-main-light dark:text-ui-main-dark"
                  size={24}
                />
                <Text className="text-center text-ui-main-light dark:text-ui-main-dark font-lexend-ebold ml-2">
                  {isSubmitting ? "Enviando..." : "Registrar"}
                </Text>
              </Pressable>
            </View>
          )}
        </form.Subscribe>

        {/* ESPACIO DINAMICO DEL TECLADO */}
        <Animated.View style={{ height: keyboardHeight }} />
      </ScrollView>
    </View>
  );
}
