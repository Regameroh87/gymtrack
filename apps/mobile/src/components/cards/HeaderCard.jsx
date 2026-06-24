import { View, Text } from "react-native";
export default function HeaderCard({ icon, title }) {
  return (
    <View className="flex-row items-center mb-5">
      {icon}
      <Text className="font-jakarta-bold ml-3 text-ui-text-main dark:text-slate-300 text-xs">
        {title}
      </Text>
    </View>
  );
}
