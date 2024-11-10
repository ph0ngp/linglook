//
//  MacView.swift
//  LingLook
//
//  Created by Phong Phan on 11/9/24.
//


import SwiftUI
import SafariServices

struct MacView: View {
    @State private var isExtensionEnabled: Bool = false
    private let extensionBundleIdentifier = "com.phongp.linglook.Extension"
    
    var body: some View {
        VStack(spacing: 20) {
            Image("LargeIcon")
                .resizable()
                .frame(width: 128, height: 128)
            
            Text("LingLook for Safari")
                .font(.title)
            
//            Button("Open Safari Extensions Preferences...") {
//                openSafariExtensionPreferences()
//            }
//            .padding()
            
            Text(isExtensionEnabled ? "Extension is enabled" : "Extension is disabled")
                .foregroundColor(isExtensionEnabled ? .green : .red)
        }
        .frame(width: 400, height: 300)
        .onAppear {
//            checkExtensionState()
        }
    }
    
//    private func openSafariExtensionPreferences() {
//        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
//            if let error = error {
//                print("Error opening preferences: \(error)")
//            }
//        }
//    }
//    
//    private func checkExtensionState() {
//        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { (state, error) in
//            if let state = state {
//                DispatchQueue.main.async {
//                    isExtensionEnabled = state.isEnabled
//                }
//            }
//        }
//    }
}

#if DEBUG
struct MacView_Previews: PreviewProvider {
    static var previews: some View {
        MacView()
    }
}
#endif
