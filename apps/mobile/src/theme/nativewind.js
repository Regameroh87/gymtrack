import { cssInterop } from "nativewind";
import { LinearGradient } from "expo-linear-gradient";
import Svg from "react-native-svg";

cssInterop(Svg, {
  className: {
    target: "style",
    nativeStyleToProp: {
      color: true,
      fill: true,
      stroke: true,
    },
  },
});

cssInterop(LinearGradient, {
  className: "style",
});
