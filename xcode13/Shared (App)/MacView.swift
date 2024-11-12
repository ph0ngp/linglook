//
//  MacView.swift
//  LingLook
//
//  Created by Phong Phan on 11/9/24.
//

import SafariServices
import SwiftUI

struct MacView: View {
    @State private var isExtensionEnabled: Bool = false
    private let extensionBundleIdentifier = "com.phongp.linglook.Extension"

    var body: some View {
        VStack(spacing: 20) {
            Image("LargeIcon")
                .resizable()
                .frame(width: 128, height: 128)

            Button(NSLocalizedString("open_safari_extension_preferences", comment: "")) {
                openSafariExtensionPreferences()
            }
            .padding()

            Text(isExtensionEnabled ? NSLocalizedString("extension_is_enabled", comment: "") : NSLocalizedString("extension_is_disabled", comment: ""))
                .foregroundColor(isExtensionEnabled ? .green : .red)
        }
        .frame(width: 400, height: 300)
        .onAppear {
            checkExtensionState()
        }
    }

    private func openSafariExtensionPreferences() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) {
            error in
            if let error = error {
                print("Error opening preferences: \(error)")
            }
        }
    }

    private func checkExtensionState() {
        SFSafariExtensionManager.getStateOfSafariExtension(
            withIdentifier: extensionBundleIdentifier
        ) { (state, error) in
            if let error = error {
                print("Error checking extension state: \(error)")
                return
            }

            if let state = state {
                DispatchQueue.main.async {
                    isExtensionEnabled = state.isEnabled
                }
            }
        }
    }
}
