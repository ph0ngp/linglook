//
//  App.swift
//  LingLook
//
//  Created by Phong Phan on 11/9/24.
//

import SwiftUI

@main
struct LingLookApp: App {
    var body: some Scene {
        WindowGroup {
            #if os(iOS)
                ContentView()
            #else
                MacView()
            #endif
        }
    }
}
